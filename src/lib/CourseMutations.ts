/** Guarded course editing and capacity validation. */
import {
    collection,
    doc,
    getDocsFromServer,
    runTransaction,
    serverTimestamp,
    where,
    query,
} from 'firebase/firestore';
import { auth, db } from './Firebase';
import { prepareAuditEntry, auditInTransaction } from './AuditLog';
import type { AcademyCourse } from '../context/AcademyContext';

export interface CourseDraft {
    name: string;
    modality: string;
    duration: string;
    description: string;
    startDate: string;
    endDate: string;
    capacity: string;
    active: boolean;
}

export function courseDraft(course: AcademyCourse): CourseDraft {
    return {
        name: course.name,
        modality: course.modality ?? '',
        duration: course.duration ?? '',
        description: course.description ?? '',
        startDate: course.startDate ?? '',
        endDate: course.endDate ?? '',
        capacity: course.capacity === null ? '' : String(course.capacity),
        active: course.active,
    };
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
const activeStatuses = new Set(['active', 'paused', 'pending_review']);

function validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// An explicit null keeps unknown course details distinct from confirmed facts.
function optionalText(value: string): string | null {
    return normalize(value) || null;
}

function optionalDate(value: string): string | null {
    return value.trim() || null;
}

/** Edits only known metadata fields; preserves document IDs, other fields, and existing enrollment references. */
/** Update an existing course without affecting its ID or linked enrollments. */
export async function saveRealCourse(previous: AcademyCourse, draft: CourseDraft): Promise<void> {
    const user = auth.currentUser;
    if (!user || (await user.getIdTokenResult()).claims.role !== 'admin') {
        throw new Error('Tu sesión no tiene permisos de administrador. Volvé a iniciar sesión.');
    }

    const name = normalize(draft.name);
    const modality = optionalText(draft.modality);
    const duration = optionalText(draft.duration);
    const description = draft.description.trim() || null;
    const startDate = optionalDate(draft.startDate);
    const endDate = optionalDate(draft.endDate);
    const capacityRaw = draft.capacity.trim();
    const capacity = capacityRaw === '' ? null : Number(capacityRaw);

    if (name.length < 3 || name.length > 160)
        throw new Error('El nombre del curso debe tener entre 3 y 160 caracteres.');
    if (modality && modality.length > 80)
        throw new Error('La modalidad es demasiado extensa.');
    if (duration && duration.length > 120)
        throw new Error('La duración es demasiado extensa.');
    if (description && description.length > 2000)
        throw new Error('La descripción supera el límite de 2000 caracteres.');
    if ((startDate && !validDate(startDate)) || (endDate && !validDate(endDate)))
        throw new Error('Ingresá fechas válidas para el curso.');
    if (startDate && endDate && endDate < startDate)
        throw new Error('La fecha de finalización no puede ser anterior a la de inicio.');
    if (capacity !== null && (!Number.isSafeInteger(capacity) || capacity < 1 || capacity > 100000))
        throw new Error('Los cupos deben ser un número entero entre 1 y 100000, o quedar sin informar.');

    // Validate against the current server catalog, not a potentially stale local snapshot.
    const courseCollection = collection(db, 'courses');
    const existingCourses = await getDocsFromServer(courseCollection);
    if (existingCourses.docs.some(item => item.id !== previous.id &&
        String(item.data().name ?? '').trim().toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) {
        throw new Error('Ya existe otro curso con ese nombre.');
    }

    // Existing enrollment records are never modified by this operation.
    const currentEnrollments = await getDocsFromServer(query(
        collection(db, 'enrollments'), where('courseId', '==', previous.id),
    ));
    const occupied = currentEnrollments.docs.filter(item => activeStatuses.has(
        String(item.data().status ?? 'pending_review'),
    )).length;
    if (capacity !== null && capacity < occupied)
        throw new Error(`Los cupos no pueden ser inferiores a las ${occupied} inscripciones vigentes o pendientes.`);

    const action = name !== previous.name ? 'course.renamed'
        : description !== previous.description ? 'course.description_updated' : 'course.updated';
    const audit = await prepareAuditEntry(action, name);
    const reference = doc(db, 'courses', previous.id);
    await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists())
            throw new Error('El curso ya no existe en Firestore. Actualizá la página.');

        const current = snapshot.data();
        // Avoid overwriting another administrator's changes made since this form was opened.
        const fields: (keyof Omit<AcademyCourse, 'id'>)[] = [
            'name', 'active', 'modality', 'duration', 'description', 'startDate', 'endDate', 'capacity',
        ];
        const wasChanged = fields.some(field => {
            const value = current[field];
            const normalized = value === undefined || value === '' ? null : value;
            const original = previous[field];
            if (field === 'name' || field === 'active') return normalized !== original;
            if (field === 'capacity') return normalized !== original;
            if (field === 'startDate' || field === 'endDate') {
                if (normalized && typeof normalized === 'object' && 'toDate' in normalized && typeof normalized.toDate === 'function') {
                    return (normalized.toDate() as Date).toISOString().slice(0, 10) !== original;
                }
            }
            return normalized !== original;
        });
        if (wasChanged)
            throw new Error('Otro administrador modificó el curso. Cerrá el formulario y revisá los cambios antes de guardar.');

        transaction.update(reference, {
            name,
            active: draft.active,
            modality,
            duration,
            description,
            startDate,
            endDate,
            capacity,
            updatedAt: serverTimestamp(),
            updatedByUid: user.uid,
        });
        auditInTransaction(transaction, audit);
    });
}
