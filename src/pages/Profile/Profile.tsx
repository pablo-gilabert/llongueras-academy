/** Self-service profile changes using authenticated Firebase APIs. */
import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth, db } from '../../lib/Firebase';
import { roleLabel } from '../../lib/Utils';
import { t } from '../../i18n/Translations';
import { Avatar, Button, Notice, PageTitle, Panel, TextInput } from '../../components/Common/Common';
import { confirmChange, showSavedSuccess } from '../../lib/ConfirmAction';
import Styles from './Profile.module.css';

type NoticeState = { message: string; tone: 'success' | 'warning' } | null;

type SensitiveInputProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
    isDni?: boolean;
    autoComplete?: string;
};

// Each sensitive field has an independent visibility toggle; its value is never persisted here.
function SensitiveInput({ label, value, onChange, required, isDni = false, autoComplete }: SensitiveInputProps) {
    const inputId = useId();
    const [visible, setVisible] = useState(false);
    const actionLabel = isDni
        ? (visible ? 'Ocultar DNI' : 'Mostrar DNI')
        : (visible ? 'Ocultar contraseña' : 'Mostrar contraseña');

    return <div className={Styles.sensitiveField}>
        <label htmlFor={inputId}>{t(label)}</label>
        <div className={Styles.sensitiveControl}>
            <input
                id={inputId}
                type={visible ? 'text' : 'password'}
                value={value}
                onChange={event => onChange(event.target.value)}
                required={required}
                autoComplete={autoComplete}
                inputMode={isDni ? 'numeric' : undefined}
            />
            <button
                className={Styles.visibilityButton}
                type="button"
                aria-label={t(actionLabel)}
                aria-pressed={visible}
                title={t(actionLabel)}
                onClick={() => setVisible(previous => !previous)}
            >
                {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
            </button>
        </div>
    </div>;
}


function describeError(error: unknown): string {
    const code = (error as Partial<FirebaseError> | null)?.code;
    switch (code) {
        case 'permission-denied':
            return 'No se pudo guardar el perfil. Revisá que las reglas de Firestore estén publicadas.';
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'La contraseña actual no es correcta.';
        case 'auth/requires-recent-login':
            return 'Necesitás confirmar nuevamente tu identidad para hacer este cambio.';
        case 'auth/email-already-in-use':
            return 'Ese correo electrónico ya está en uso.';
        case 'auth/invalid-email':
            return 'Ingresá una dirección de correo válida.';
        case 'auth/weak-password':
            return 'La nueva contraseña no cumple con los requisitos de seguridad.';
        case 'auth/too-many-requests':
            return 'Demasiados intentos. Volvé a intentarlo más tarde.';
        case 'auth/network-request-failed':
        case 'unavailable':
            return 'No se pudo establecer conexión. Revisá tu acceso a Internet.';
        default:
            return 'No se pudo completar la operación. Intentá nuevamente.';
    }
}

async function confirmPassword(password: string): Promise<void> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser?.email)
        throw new Error('There is no authenticated email/password account.');

    await reauthenticateWithCredential(
        firebaseUser,
        EmailAuthProvider.credential(firebaseUser.email, password),
    );
}

export function Profile() {
    const { user, refreshAccount } = useAuth();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [dni, setDni] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    const [savingEmail, setSavingEmail] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);
    const [profileNotice, setProfileNotice] = useState<NoticeState>(null);
    const [emailNotice, setEmailNotice] = useState<NoticeState>(null);
    const [passwordNotice, setPasswordNotice] = useState<NoticeState>(null);

    // Use the verified profile whenever it changes, including after a successful save.
    useEffect(() => {
        if (!user)
            return;

        setFirstName(user.firstName ?? user.name.trim().split(/\s+/)[0] ?? '');
        setLastName(user.lastName ?? '');
        setDni(user.dni ?? '');
        setNewEmail(user.email);
    }, [user]);

    if (!user)
        return null;

    const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setProfileNotice(null);

        const first = firstName.trim().replace(/\s+/g, ' ');
        const last = lastName.trim().replace(/\s+/g, ' ');
        const documentNumber = dni.trim();
        if (!first || !last || first.length > 80 || last.length > 80) {
            setProfileNotice({ tone: 'warning', message: 'Ingresá nombre y apellido (máximo 80 caracteres cada uno).' });
            return;
        }
        if (documentNumber && !/^\d{6,12}$/.test(documentNumber)) {
            setProfileNotice({ tone: 'warning', message: 'El DNI debe contener entre 6 y 12 números, o quedar vacío.' });
            return;
        }

        const firebaseUser = auth.currentUser;
        if (!firebaseUser || firebaseUser.uid !== user.id)
            return;

        if (!await confirmChange('profile')) return;
        setSavingProfile(true);
        try {
            // This collection accepts only personal fields, never roles or claims.
            await setDoc(doc(db, 'accountProfiles', firebaseUser.uid), {
                firstName: first,
                lastName: last,
                dni: documentNumber,
                updatedAt: serverTimestamp(),
            });
            await updateProfile(firebaseUser, { displayName: `${first} ${last}` });
            await refreshAccount();
            setProfileNotice({ tone: 'success', message: 'Tus datos personales se guardaron correctamente.' });
            showSavedSuccess();
        }
        catch (error) {
            setProfileNotice({ tone: 'warning', message: describeError(error) });
        }
        finally {
            setSavingProfile(false);
        }
    };

    const saveEmail = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setEmailNotice(null);
        const firebaseUser = auth.currentUser;
        const email = newEmail.trim();
        if (!firebaseUser?.email || firebaseUser.uid !== user.id)
            return;
        if (email.toLowerCase() === firebaseUser.email.toLowerCase()) {
            setEmailNotice({ tone: 'warning', message: 'Ingresá un correo diferente del actual.' });
            return;
        }
        if (!emailPassword) {
            setEmailNotice({ tone: 'warning', message: 'Ingresá tu contraseña actual para confirmar el cambio.' });
            return;
        }

        if (!await confirmChange('email')) return;
        setSavingEmail(true);
        try {
            await confirmPassword(emailPassword);
            // The address is not changed until the recipient verifies the new email.
            await verifyBeforeUpdateEmail(firebaseUser, email);
            setEmailPassword('');
            setEmailNotice({ tone: 'success', message: 'Te enviamos un enlace de verificación al correo nuevo. El correo de acceso cambiará cuando lo confirmes.' });
            showSavedSuccess('verification');
        }
        catch (error) {
            setEmailNotice({ tone: 'warning', message: describeError(error) });
        }
        finally {
            setSavingEmail(false);
        }
    };

    const savePassword = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPasswordNotice(null);
        if (newPassword.length < 8) {
            setPasswordNotice({ tone: 'warning', message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            return;
        }
        if (newPassword !== passwordConfirmation) {
            setPasswordNotice({ tone: 'warning', message: 'Las contraseñas nuevas no coinciden.' });
            return;
        }
        if (!currentPassword) {
            setPasswordNotice({ tone: 'warning', message: 'Ingresá tu contraseña actual para confirmar el cambio.' });
            return;
        }

        const firebaseUser = auth.currentUser;
        if (!firebaseUser || firebaseUser.uid !== user.id)
            return;

        if (!await confirmChange('password')) return;
        setSavingPassword(true);
        try {
            await confirmPassword(currentPassword);
            await updatePassword(firebaseUser, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setPasswordConfirmation('');
            setPasswordNotice({ tone: 'success', message: 'Tu contraseña de acceso se actualizó correctamente.' });
            showSavedSuccess();
        }
        catch (error) {
            setPasswordNotice({ tone: 'warning', message: describeError(error) });
        }
        finally {
            setSavingPassword(false);
        }
    };

    return <>
        <PageTitle
            kicker={t('MI ESPACIO PERSONAL')}
            title={t('Editar mi perfil')}
            description={t('Actualizá tus datos personales y las credenciales con las que ingresás al campus.')}
        />
        <div className={Styles.layout}>
            <div className={Styles.mainColumn}>
                <Panel title={t('Información personal')} subtitle={t('Tu nombre se mostrará en el saludo del campus y en el menú de usuario.')}>
                    <div className={Styles.identity}>
                        <Avatar name={user.name} size="large" />
                        <div>
                            <strong>{user.name}</strong>
                            <small>{t(roleLabel[user.role])}</small>
                        </div>
                    </div>
                    <form className={Styles.form} onSubmit={event => { void saveProfile(event); }}>
                        <div className={Styles.twoColumns}>
                            <TextInput label="Nombre" value={firstName} onChange={setFirstName} required />
                            <TextInput label="Apellido" value={lastName} onChange={setLastName} required />
                        </div>
                        <SensitiveInput label="DNI (opcional)" value={dni} onChange={setDni} isDni autoComplete="off" />
                        <p className={Styles.hint}>{t('El DNI es opcional y podés completarlo más adelante. No cambia tus permisos de acceso.')}</p>
                        {profileNotice && <Notice tone={profileNotice.tone}>{t(profileNotice.message)}</Notice>}
                        <div className={Styles.actions}><Button type="submit" className="academyWriteAction" disabled={savingProfile}>{t(savingProfile ? 'Guardando…' : 'Guardar datos personales')}</Button></div>
                    </form>
                </Panel>
                <Panel title={t('Cambiar correo de acceso')} subtitle={t('Tu correo actual se mantiene hasta que verifiques la nueva dirección.')}>
                    <form className={Styles.form} onSubmit={event => { void saveEmail(event); }}>
                        <TextInput label="Correo actual" value={user.email} onChange={() => { }} disabled />
                        <TextInput label="Nuevo correo electrónico" value={newEmail} onChange={setNewEmail} type="email" required />
                        <SensitiveInput label="Contraseña actual" value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" required />
                        {emailNotice && <Notice tone={emailNotice.tone}>{t(emailNotice.message)}</Notice>}
                        <div className={Styles.actions}><Button type="submit" className="academyWriteAction" disabled={savingEmail}>{t(savingEmail ? 'Enviando…' : 'Enviar verificación de correo')}</Button></div>
                    </form>
                </Panel>
                <Panel title={t('Cambiar contraseña')} subtitle={t('Por seguridad, confirmá tu contraseña actual antes de establecer una nueva.')}>
                    <form className={Styles.form} onSubmit={event => { void savePassword(event); }}>
                        <SensitiveInput label="Contraseña actual" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" required />
                        <SensitiveInput label="Nueva contraseña" value={newPassword} onChange={setNewPassword} autoComplete="new-password" required />
                        <SensitiveInput label="Confirmar nueva contraseña" value={passwordConfirmation} onChange={setPasswordConfirmation} autoComplete="new-password" required />
                        <p className={Styles.hint}>{t('Usá al menos 8 caracteres. Nunca compartas tu contraseña.')}</p>
                        {passwordNotice && <Notice tone={passwordNotice.tone}>{t(passwordNotice.message)}</Notice>}
                        <div className={Styles.actions}><Button type="submit" className="academyWriteAction" disabled={savingPassword}>{t(savingPassword ? 'Actualizando…' : 'Actualizar contraseña')}</Button></div>
                    </form>
                </Panel>
            </div>
            <div className={Styles.sideColumn}>
                <Panel title={t('Tu acceso institucional')} subtitle={t('Los permisos están protegidos y no se modifican desde este formulario.')}>
                    <div className={Styles.summaryRow}><UserRound size={17} /><span>{t(roleLabel[user.role])}</span></div>
                    <div className={Styles.summaryRow}><Mail size={17} /><span>{user.email}</span></div>
                    <div className={Styles.summaryRow}><ShieldCheck size={17} /><span>{t('Acceso verificado')}</span></div>
                    <div className={Styles.summaryRow}><LockKeyhole size={17} /><span>{t('Seguridad administrada por Firebase Authentication')}</span></div>
                </Panel>
            </div>
        </div>
    </>;
}
