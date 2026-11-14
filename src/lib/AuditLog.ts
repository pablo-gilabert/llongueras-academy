/** Audit event definitions and readable activity descriptions. */
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import type { DocumentData, DocumentReference, Transaction, WriteBatch } from 'firebase/firestore';
import { auth, db } from './Firebase';

export type AuditAction =
    | 'student.created' | 'student.updated'
    | 'enrollment.created' | 'enrollment.updated' | 'enrollment.transferred'
    | 'course.updated' | 'course.renamed' | 'course.description_updated'
    | 'teacher.created' | 'teacher.updated'
    | 'attendance.saved' | 'evaluation.created' | 'grades.saved';

export interface AuditEntry {
    id: string;
    actorUid: string;
    actorName: string;
    action: AuditAction;
    subject: string;
    context: string;
    createdAt: Date | null;
}

type PendingEntry = { reference: DocumentReference; fields: DocumentData };
const clean = (text: string, max: number) => text.trim().replace(/\s+/g, ' ').slice(0, max);

/**
 * The exclusion is a trusted Auth custom claim, not an editable browser setting.
 * No activity documents or viewing events are created for excluded accounts.
 */
export async function prepareAuditEntry(
    action: AuditAction,
    subject: string,
    context = '',
): Promise<PendingEntry | null> {
    const user = auth.currentUser;
    if (!user) throw new Error('Necesitás iniciar sesión para guardar el registro.');
    const result = await user.getIdTokenResult();
    if (result.claims.role !== 'admin') return null;
    if (result.claims.auditExcluded === true) return null;

    return {
        reference: doc(collection(db, 'auditLogs')),
        fields: {
            actorUid: user.uid,
            actorName: clean(user.displayName || user.email?.split('@')[0] || 'Administrador', 120),
            action,
            subject: clean(subject || 'Registro académico', 160),
            context: clean(context, 180),
            createdAt: serverTimestamp(),
        },
    };
}

/** Include the event in the same transaction as the academic write. */
export function auditInTransaction(transaction: Transaction, event: PendingEntry | null): void {
    if (event) transaction.set(event.reference, event.fields);
}

/** Include the event in the same batch as the academic write. */
export function auditInBatch(batch: WriteBatch, event: PendingEntry | null): void {
    if (event) batch.set(event.reference, event.fields);
}

/** Format events without ever storing changed DNI, contact data, notes or scores. */
export function activityDescription(entry: AuditEntry, english: boolean): string {
    const actionDescriptions: Record<AuditAction, [string, string]> = {
        'student.created': ['registró la ficha de', 'created a student record for'],
        'student.updated': ['actualizó datos personales de', 'updated personal details for'],
        'enrollment.created': ['inscribió a un alumno en', 'enrolled a student in'],
        'enrollment.updated': ['actualizó una inscripción de', 'updated an enrollment for'],
        'enrollment.transferred': ['trasladó una inscripción a', 'transferred an enrollment to'],
        'course.updated': ['actualizó información de la carrera', 'updated information for the course'],
        'course.renamed': ['modificó el nombre de la carrera', 'renamed the course'],
        'course.description_updated': ['actualizó la descripción de la carrera', 'updated the course description for'],
        'teacher.created': ['registró al docente', 'registered the teacher'],
        'teacher.updated': ['actualizó la ficha del docente', 'updated the teacher record for'],
        'attendance.saved': ['cargó o corrigió asistencias de', 'recorded or corrected attendance for'],
        'evaluation.created': ['publicó una evaluación en', 'created an evaluation in'],
        'grades.saved': ['publicó o corrigió notas de', 'published or corrected grades for'],
    };
    const [spanish, translated] = actionDescriptions[entry.action];
    return `${english ? translated : spanish} ${entry.subject}${entry.context ? ` · ${entry.context}` : ''}`;
}
