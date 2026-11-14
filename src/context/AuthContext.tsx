/** Verified institutional authentication and session lifecycle using Firebase Auth. */
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    browserSessionPersistence,
    reload,
    onIdTokenChanged,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../lib/Firebase';
import type { User } from '../Types';

// Only trusted Firebase ID-token claims grant an institutional role.
// A tutor additionally needs an active, matching Firestore teacher profile.
/** Resolve a trusted role from ID-token claims and the teacher profile binding. */
async function getVerifiedUser(firebaseUser: FirebaseUser): Promise<User | null> {
    const token = await firebaseUser.getIdTokenResult();
    const { role, teacherId } = token.claims;

    const displayName = firebaseUser.displayName?.trim() || firebaseUser.email?.split('@')[0] || 'Usuario';
    const fallbackFirstName = displayName.split(/\s+/)[0];
    // The user's private contact profile is kept separate from institutional roles.
    // Missing profile documents never prevent a previously verified login.
    const profile = await getDocFromServer(doc(db, 'accountProfiles', firebaseUser.uid))
        .then(snapshot => snapshot.exists() ? snapshot.data() : null)
        .catch(() => null);
    const firstName = typeof profile?.firstName === 'string' && profile.firstName.trim()
        ? profile.firstName.trim() : fallbackFirstName;
    const lastName = typeof profile?.lastName === 'string' ? profile.lastName.trim() : '';

    const base = {
        id: firebaseUser.uid,
        name: profile?.firstName && profile?.lastName
            ? `${firstName} ${lastName}` : displayName,
        firstName,
        lastName,
        dni: typeof profile?.dni === 'string' ? profile.dni : '',
        email: firebaseUser.email ?? '',
        active: true,
    };

    if (role === 'admin')
        return { ...base, role: 'admin' };

    if (role !== 'tutor' || typeof teacherId !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(teacherId))
        return null;

    // This check deliberately goes to Firestore, not a cached or local document.
    // Security rules separately enforce the same teacher-ID / UID relationship.
    const teacher = await getDocFromServer(doc(db, 'teachers', teacherId));
    if (!teacher.exists() || teacher.data().active !== true || teacher.data().authUid !== firebaseUser.uid)
        return null;

    return {
        ...base,
        name: typeof teacher.data().fullName === 'string' ? teacher.data().fullName : base.name,
        role: 'tutor',
        teacherId,
    };
}

// Keep authentication errors friendly without revealing account existence.
function describeAuthError(error: unknown): string {
    const code = (error as Partial<FirebaseError> | null)?.code;

    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/invalid-email':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
            return 'Correo electrónico o contraseña incorrectos.';
        case 'auth/user-disabled':
            return 'Esta cuenta está deshabilitada. Contactá a la administración.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos. Probá nuevamente más tarde.';
        case 'auth/network-request-failed':
            return 'No se pudo conectar con Firebase. Revisá tu conexión.';
        case 'auth/unauthorized-domain':
            return 'Este dominio no está autorizado en Firebase Authentication.';
        default:
            return 'No se pudo iniciar sesión. Intentá nuevamente.';
    }
}

interface AuthContextValue {
    user: User | null;
    authReady: boolean;
    authMessage: string | null;
    clearAuthMessage: () => void;
    login: (email: string, password: string) => Promise<string | null>;
    logout: () => Promise<void>;
    refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Keep the campus locked until Firebase has restored and verified the session. */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [authMessage, setAuthMessage] = useState<string | null>(null);
    const verifiedUid = useRef<string | null>(null);

    useEffect(() => {
        let active = true;
        let version = 0;

        // Auth state is restored and periodically refreshed by the Firebase SDK.
        const unsubscribe = onIdTokenChanged(auth, async firebaseUser => {
            const check = ++version;
            // A token refresh for the same verified account must not unmount forms.
            if (!firebaseUser || verifiedUid.current !== firebaseUser.uid) {
                setAuthReady(false);
                setUser(null);
            }

            if (!firebaseUser) {
                verifiedUid.current = null;
                if (active && check === version)
                    setAuthReady(true);
                return;
            }

            try {
                const verifiedUser = await getVerifiedUser(firebaseUser);
                if (!active || check !== version)
                    return;

                if (!verifiedUser) {
                    verifiedUid.current = null;
                    setUser(null);
                    setAuthMessage('Tu cuenta no tiene un acceso institucional habilitado.');
                    await signOut(auth);
                    return;
                }

                verifiedUid.current = firebaseUser.uid;
                setUser(verifiedUser);
                setAuthMessage(null);
            }
            catch {
                if (!active || check !== version)
                    return;

                verifiedUid.current = null;
                setUser(null);
                setAuthMessage('No se pudo verificar tu sesión. Ingresá nuevamente.');
                await signOut(auth).catch(() => { /* Keep the campus locked. */ });
            }
            finally {
                if (active && check === version)
                    setAuthReady(true);
            }
        }, () => {
            if (active) {
                verifiedUid.current = null;
                setUser(null);
                setAuthReady(true);
                setAuthMessage('No se pudo verificar tu sesión. Ingresá nuevamente.');
            }
        });

        return () => {
            active = false;
            unsubscribe();
        };
    }, []);

    // Every sign-in is verified against the server before the UI grants access.
    const login = async (email: string, password: string): Promise<string | null> => {
        setAuthMessage(null);

        try {
            // Closing the tab ends the browser session; passwords are never stored here.
            await setPersistence(auth, browserSessionPersistence);
            const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const token = await credential.user.getIdTokenResult(true);

            if (token.claims.role !== 'admin' && token.claims.role !== 'tutor') {
                const message = 'Tu cuenta no tiene un acceso institucional habilitado.';
                setAuthMessage(message);
                await signOut(auth);
                return message;
            }

            const verifiedUser = await getVerifiedUser(credential.user);
            if (!verifiedUser) {
                const message = 'Tu cuenta no tiene un acceso institucional habilitado.';
                setAuthMessage(message);
                await signOut(auth);
                return message;
            }

            verifiedUid.current = credential.user.uid;
            setUser(verifiedUser);
            setAuthReady(true);
            return null;
        }
        catch (error) {
            // A failed claim refresh must not leave an unverified session active.
            if (auth.currentUser)
                await signOut(auth).catch(() => { /* The interface remains locked. */ });
            verifiedUid.current = null;
            setUser(null);
            setAuthReady(true);
            const message = describeAuthError(error);
            setAuthMessage(message);
            return message;
        }
    };

    // Reload profile updates without changing the verified institutional role.
    const refreshAccount = async (): Promise<void> => {
        const firebaseUser = auth.currentUser;
        if (!firebaseUser)
            throw new Error('No authenticated account.');
        await reload(firebaseUser);
        const verifiedUser = await getVerifiedUser(firebaseUser);
        if (!verifiedUser)
            throw new Error('Institutional access could not be verified.');
        setUser(verifiedUser);
    };

    const logout = async () => {
        await signOut(auth);
        verifiedUid.current = null;
        setUser(null);
        setAuthMessage(null);
    };

    return <AuthContext.Provider value={{
        user,
        authReady,
        authMessage,
        clearAuthMessage: () => setAuthMessage(null),
        login,
        logout,
        refreshAccount,
    }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('AuthProvider must wrap the application.');

    return context;
}
