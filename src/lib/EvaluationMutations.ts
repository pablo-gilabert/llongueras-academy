/** Evaluation and grade management with transactional safeguards. */
import { collection, doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './Firebase';
import { prepareAuditEntry, auditInTransaction } from './AuditLog';

export interface RealEvaluation {
    id: string;
    courseId: string;
    title: string;
    date: string;
    maxScore: number;
    description: string;
}

export interface RealGrade {
    evaluationId: string;
    enrollmentId: string;
    studentId: string;
    courseId: string;
    score: number;
    feedback: string;
}

export interface GradeChange {
    enrollmentId: string;
    studentId: string;
    score: number;
    feedback: string;
    expectedScore: number | null;
    expectedFeedback: string;
}

const enrollmentStatuses = new Set(['active', 'paused', 'completed', 'pending_review']);
const identifierPattern = /^[\w-]+$/;

function validDay(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function firestoreDay(value: unknown): string | null {
    if (typeof value === 'string' && validDay(value)) return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const date = (value.toDate as () => Date)();
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    }
    return null;
}

async function requireAdmin() {
    const user = auth.currentUser;
    if (!user || (await user.getIdTokenResult()).claims.role !== 'admin')
        throw new Error('Solo los administradores pueden modificar evaluaciones.');
    return user;
}

/** Add an assessment to an existing, authorized course. */
export async function createRealEvaluation(input: Omit<RealEvaluation, 'id'>): Promise<string> {
    const user = await requireAdmin();
    const { courseId, date, description } = input;
    const title = input.title.trim();
    if (!identifierPattern.test(courseId)) throw new Error('Seleccioná un curso válido.');
    if (title.length < 3 || title.length > 160) throw new Error('El título debe tener entre 3 y 160 caracteres.');
    if (!validDay(date)) throw new Error('Seleccioná una fecha válida.');
    if (!Number.isFinite(input.maxScore) || input.maxScore < 1 || input.maxScore > 100 ||
        Math.abs(Math.round(input.maxScore * 100) - input.maxScore * 100) > 1e-8)
        throw new Error('La nota máxima debe estar entre 1 y 100, con hasta dos decimales.');
    if (description.trim().length > 1000) throw new Error('La descripción supera los 1000 caracteres.');

    const courseRef = doc(db, 'courses', courseId);
    const currentCourse = await getDocFromServer(courseRef);
    const audit = await prepareAuditEntry('evaluation.created', String(currentCourse.data()?.name ?? 'curso'), title);
    const evaluationRef = doc(collection(db, 'evaluations'));

    await runTransaction(db, async transaction => {
        const course = await transaction.get(courseRef);
        if (!course.exists() || course.data().active !== true)
            throw new Error('El curso no existe o está inactivo.');
        transaction.set(evaluationRef, {
            courseId,
            title,
            date,
            maxScore: input.maxScore,
            description: description.trim(),
            createdAt: serverTimestamp(),
            createdBy: user.uid,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
        });
        auditInTransaction(transaction, audit);
    });

    return evaluationRef.id;
}

/** Validate grade ranges and save changes against current Firestore snapshots. */
export async function saveRealGrades(input: {
    evaluation: RealEvaluation;
    changes: GradeChange[];
}): Promise<number> {
    const user = await requireAdmin();
    const { evaluation, changes } = input;
    if (!identifierPattern.test(evaluation.id) || !identifierPattern.test(evaluation.courseId))
        throw new Error('Seleccioná una evaluación válida.');
    if (!changes.length || changes.length > 150)
        throw new Error('Seleccioná entre 1 y 150 calificaciones para guardar.');

    const seen = new Set<string>();
    changes.forEach(change => {
        if (!identifierPattern.test(change.enrollmentId) || !identifierPattern.test(change.studentId))
            throw new Error('Encontramos una inscripción inválida.');
        if (seen.has(change.enrollmentId)) throw new Error('Una inscripción aparece repetida.');
        seen.add(change.enrollmentId);
        if (!Number.isFinite(change.score) || change.score < 0 || change.score > evaluation.maxScore ||
            Math.abs(Math.round(change.score * 100) - change.score * 100) > 1e-8)
            throw new Error('Las notas deben estar dentro de la escala y tener hasta dos decimales.');
        if (change.feedback.trim().length > 500)
            throw new Error('Una observación supera los 500 caracteres.');
    });

    const audit = await prepareAuditEntry('grades.saved', evaluation.title, `${changes.length} ${changes.length === 1 ? 'nota' : 'notas'}`);
    const evaluationRef = doc(db, 'evaluations', evaluation.id);
    const enrollmentRefs = changes.map(item => doc(db, 'enrollments', item.enrollmentId));
    const gradeRefs = changes.map(item => doc(db, 'grades', `${evaluation.id}_${item.enrollmentId}`));

    await runTransaction(db, async transaction => {
        // Reads must finish before the first write in a Firestore transaction.
        const currentEvaluation = await transaction.get(evaluationRef);
        const enrollments = await Promise.all(enrollmentRefs.map(reference => transaction.get(reference)));
        const grades = await Promise.all(gradeRefs.map(reference => transaction.get(reference)));

        if (!currentEvaluation.exists()) throw new Error('La evaluación ya no existe. Actualizá la página.');
        const current = currentEvaluation.data();
        if (current.courseId !== evaluation.courseId || current.maxScore !== evaluation.maxScore ||
            current.date !== evaluation.date)
            throw new Error('La evaluación cambió. Volvé a cargar las notas antes de guardar.');
        const local = new Date();
        const today = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
        if (firestoreDay(current.date) && current.date > today)
            throw new Error('No se pueden calificar evaluaciones futuras.');

        changes.forEach((entry, index) => {
            const enrollment = enrollments[index];
            if (!enrollment.exists() || enrollment.data().courseId !== evaluation.courseId ||
                enrollment.data().studentId !== entry.studentId ||
                !enrollmentStatuses.has(String(enrollment.data().status)))
                throw new Error('Una inscripción cambió de curso o estado. Actualizá la página.');
            const startDate = firestoreDay(enrollment.data().startDate);
            if (startDate && startDate > evaluation.date)
                throw new Error('La fecha de la evaluación es anterior a una inscripción.');

            const previous = grades[index];
            const previousScore = previous.exists() ? previous.data().score : null;
            const previousFeedback = previous.exists() ? String(previous.data().feedback ?? '') : '';
            if (previousScore !== entry.expectedScore || previousFeedback !== entry.expectedFeedback)
                throw new Error('Otro administrador modificó una nota. Revisá los nuevos datos antes de guardar.');
        });

        changes.forEach((entry, index) => {
            transaction.set(gradeRefs[index], {
                courseId: evaluation.courseId,
                evaluationId: evaluation.id,
                enrollmentId: entry.enrollmentId,
                studentId: entry.studentId,
                score: entry.score,
                feedback: entry.feedback.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(grades[index].exists() ? {} : {
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                }),
            }, { merge: true });
        });
        auditInTransaction(transaction, audit);
    });

    return changes.length;
}
