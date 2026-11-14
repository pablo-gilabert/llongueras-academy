/** Administrative audit feed subscription and presentation state. */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/Firebase';
import { useAuth } from './AuthContext';
import type { AuditAction, AuditEntry } from '../lib/AuditLog';

interface ActivityState {
    items: AuditEntry[];
    loading: boolean;
    error: string | null;
}

const ActivityContext = createContext<ActivityState>({ items: [], loading: false, error: null });

const allowedActions = new Set<AuditAction>([
    'student.created', 'student.updated',
    'enrollment.created', 'enrollment.updated', 'enrollment.transferred',
    'course.updated', 'course.renamed', 'course.description_updated',
    'teacher.created', 'teacher.updated', 'attendance.saved',
    'evaluation.created', 'grades.saved',
]);

export function ActivityProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [state, setState] = useState<ActivityState>({ items: [], loading: true, error: null });

    useEffect(() => {
        if (user?.role !== 'admin') {
            setState({ items: [], loading: false, error: null });
            return;
        }
        setState({ items: [], loading: true, error: null });
        const recent = query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'), limit(40));
        return onSnapshot(recent, snapshot => {
            const items: AuditEntry[] = snapshot.docs.flatMap(item => {
                const fields = item.data();
                if (!allowedActions.has(fields.action as AuditAction)) return [];
                return [{
                    id: item.id,
                    actorUid: typeof fields.actorUid === 'string' ? fields.actorUid : '',
                    actorName: typeof fields.actorName === 'string' ? fields.actorName : 'Administrador',
                    action: fields.action as AuditAction,
                    subject: typeof fields.subject === 'string' ? fields.subject : 'Registro académico',
                    context: typeof fields.context === 'string' ? fields.context : '',
                    createdAt: fields.createdAt?.toDate?.() ?? null,
                }];
            });
            setState({ items, loading: false, error: null });
        }, error => {
            setState({
                items: [],
                loading: false,
                error: error.code === 'permission-denied'
                    ? 'Publicá las reglas nuevas de Firestore para ver la actividad.'
                    : 'No se pudo cargar la actividad reciente.',
            });
        });
    }, [user?.id, user?.role]);

    return <ActivityContext.Provider value={state}>{children}</ActivityContext.Provider>;
}

export const useActivity = (): ActivityState => useContext(ActivityContext);
