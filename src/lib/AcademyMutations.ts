/** Validated Firestore operations for students and enrollments. */
import {
    collection,
    doc,
    getDocFromServer,
    getDocsFromServer,
    query,
    serverTimestamp,
    writeBatch,
    where,
    runTransaction,
    Timestamp,
} from 'firebase/firestore';
import { auth, db } from './Firebase';
import { prepareAuditEntry, auditInBatch, auditInTransaction } from './AuditLog';
import type { AcademyStudent } from '../context/AcademyContext';

export type AcademicStatus = 'pending_review' | 'active' | 'paused' | 'completed' | 'withdrawn';

export interface StudentDraft {
    fullName: string;
    firstName: string;
    lastName: string;
    dni: string;
    birthDate: string;
    birthPlace: string;
    nationalityCode: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    active: 'unknown' | 'true' | 'false';
}

export interface EnrollmentDraft {
    studentId: string;
    courseId: string;
    startDate: string;
    status: AcademicStatus;
    courseworkCompleted: 'unknown' | 'true' | 'false';
    courseCompleted: 'unknown' | 'true' | 'false';
    completionNotes: string;
}

export interface TransferDraft {
    toCourseId: string;
    startDate: string;
    reason: string;
}

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');
const optional = (value: string): string | null => normalize(value) || null;
const triState = (value: 'unknown' | 'true' | 'false'): boolean | null =>
    value === 'unknown' ? null : value === 'true';

function calendarDate(value: string, required: boolean): Timestamp | null {
    if (!value && !required) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error('Ingresá una fecha válida.');
    const [year, month, day] = match.slice(1).map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day)
        throw new Error('La fecha ingresada no existe.');
    return Timestamp.fromDate(parsed);
}

/** Check the current Firebase claim before initiating privileged writes. */
async function requireAdministrator(): Promise<string> {
    const user = auth.currentUser;
    if (!user || (await user.getIdTokenResult()).claims.role !== 'admin')
        throw new Error('Tu sesión no tiene permisos de administrador. Volvé a iniciar sesión.');
    return user.uid;
}

function studentFields(input: StudentDraft, allowMissingDni = false) {
    const fullName = normalize(input.fullName);
    const firstName = optional(input.firstName);
    const lastName = optional(input.lastName);
    const dni = input.dni.replace(/[.\s-]/g, '');
    const email = input.email.trim().toLowerCase();
    if (fullName.length < 3 || fullName.length > 160)
        throw new Error('Ingresá el nombre completo del alumno (hasta 160 caracteres).');
    if ((!dni && !allowMissingDni) || (dni && !/^\d{7,9}$/.test(dni)))
        throw new Error('El DNI debe contener de 7 a 9 dígitos.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Revisá el correo electrónico.');
    if ((firstName && !lastName) || (!firstName && lastName))
        throw new Error('Completá tanto el nombre como el apellido, o dejá ambos pendientes.');
    for (const value of [input.birthPlace, input.nationalityCode, input.phone, input.address, input.city]) {
        if (value.length > 300) throw new Error('Uno de los campos supera el límite de caracteres.');
    }
    const birthDate = calendarDate(input.birthDate, false);
    if (birthDate && birthDate.toDate().getTime() > Date.now())
        throw new Error('La fecha de nacimiento no puede ser futura.');
    return {
        fullName,
        firstName,
        lastName,
        nameNeedsReview: !firstName || !lastName,
        dni,
        email: email || null,
        phone: optional(input.phone),
        birthDate,
        birthPlace: optional(input.birthPlace),
        nationalityCode: optional(input.nationalityCode)?.toUpperCase() ?? null,
        address: optional(input.address),
        city: optional(input.city),
        active: triState(input.active),
    };
}

async function ensureUniqueDni(dni: string, currentId?: string) {
    // A fresh server query protects against duplicates from prior CSV imports.
    const matches = await getDocsFromServer(query(collection(db, 'students'), where('dni', '==', dni)));
    if (matches.docs.some(item => item.id !== currentId))
        throw new Error('Ya existe una ficha con ese DNI. Usá la ficha existente.');
}

/** Validate personal fields and persist changes without overwriting unrelated records. */
export async function saveStudent(input: StudentDraft, existingId?: string): Promise<void> {
    const uid = await requireAdministrator();
    const student = existingId ? doc(db, 'students', existingId) : null;
    const existing = student ? await getDocFromServer(student) : null;
    if (student && !existing?.exists())
        throw new Error('La ficha ya no existe. Actualizá la página.');

    // Only a previously imported partial profile may remain without a DNI.
    // New profiles and existing profiles with a verified DNI still require one.
    const allowMissingDni = Boolean(existing?.exists() && !existing.data().dni);
    const fields = studentFields(input, allowMissingDni);
    if (fields.dni) await ensureUniqueDni(fields.dni, existingId);
    // Keep the academic write and the corresponding feed entry atomic.
    const audit = await prepareAuditEntry(student ? 'student.updated' : 'student.created', fields.fullName);
    const batch = writeBatch(db);
    if (student) {
        batch.update(student, { ...fields, updatedAt: serverTimestamp(), updatedBy: uid });
    } else {
        const reference = doc(collection(db, 'students'));
        batch.set(reference, {
            ...fields,
            source: 'manual-campus',
            createdAt: serverTimestamp(),
            createdBy: uid,
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });
    }
    auditInBatch(batch, audit);
    await batch.commit();
}

function assertStatus(status: string): asserts status is AcademicStatus {
    if (!['pending_review', 'active', 'paused', 'completed', 'withdrawn'].includes(status))
        throw new Error('Seleccioná un estado válido.');
}

async function ensureEnrollmentAllowed(studentId: string, courseId: string, startDate: string, excludeId?: string) {
    const student = await getDocFromServer(doc(db, 'students', studentId));
    const course = await getDocFromServer(doc(db, 'courses', courseId));
    if (!student.exists() || !course.exists())
        throw new Error('El alumno o el curso seleccionado ya no existe.');
    if (student.data().active === false)
        throw new Error('El alumno figura inactivo. Revisá su ficha antes de inscribirlo.');
    if (course.data().active !== true)
        throw new Error('No se pueden crear inscripciones en cursos inactivos.');
    const history = await getDocsFromServer(query(collection(db, 'enrollments'), where('studentId', '==', studentId)));
    for (const item of history.docs) {
        if (item.id === excludeId || item.data().courseId !== courseId) continue;
        const data = item.data();
        const originalDate = data.startDate && typeof data.startDate.toDate === 'function'
            ? data.startDate.toDate().toISOString().slice(0, 10)
            : data.startDate;
        if (originalDate === startDate)
            throw new Error('Ya existe una inscripción en ese curso con la misma fecha de inicio.');
        if (!['completed', 'withdrawn', 'transferred'].includes(data.status))
            throw new Error('El alumno ya tiene una inscripción vigente o pendiente en ese curso.');
    }
}

// Capacity is a client-side preflight; a server-side constraint is needed for strict concurrency guarantees.
const capacityStatuses = new Set(['active', 'paused', 'pending_review']);

async function ensureCourseCapacity(courseId: string, requestedStatus: string, excludeId?: string): Promise<void> {
    if (!capacityStatuses.has(requestedStatus)) return;

    const course = await getDocFromServer(doc(db, 'courses', courseId));
    if (!course.exists()) throw new Error('El curso seleccionado ya no existe.');

    const capacity = course.data().capacity;
    if (typeof capacity !== 'number' || !Number.isSafeInteger(capacity) || capacity < 1) return;

    const enrollments = await getDocsFromServer(query(
        collection(db, 'enrollments'), where('courseId', '==', courseId),
    ));
    const occupied = enrollments.docs.filter(item =>
        item.id !== excludeId && capacityStatuses.has(String(item.data().status ?? 'pending_review'))
    ).length;
    if (occupied >= capacity)
        throw new Error(`No hay cupos disponibles en este curso (${occupied}/${capacity}).`);
}

/** Create an enrollment pointing to existing student and course documents. */
export async function createEnrollment(input: EnrollmentDraft): Promise<void> {
    const uid = await requireAdministrator();
    assertStatus(input.status);
    if (!input.studentId || !input.courseId) throw new Error('Seleccioná alumno y curso.');
    const startDate = calendarDate(input.startDate, true);
    if (input.completionNotes.length > 3000) throw new Error('Las observaciones superan el límite de caracteres.');
    await ensureEnrollmentAllowed(input.studentId, input.courseId, input.startDate);
    await ensureCourseCapacity(input.courseId, input.status);
    const reference = doc(collection(db, 'enrollments'));
    const course = await getDocFromServer(doc(db, 'courses', input.courseId));
    const audit = await prepareAuditEntry('enrollment.created', String(course.data()?.name ?? 'curso'));
    const batch = writeBatch(db);
    batch.set(reference, {
        studentId: input.studentId,
        courseId: input.courseId,
        startDate,
        status: input.status,
        courseworkCompleted: triState(input.courseworkCompleted),
        courseCompleted: triState(input.courseCompleted),
        completionNotes: input.completionNotes.trim(),
        source: 'manual-campus',
        createdAt: serverTimestamp(),
        createdBy: uid,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    auditInBatch(batch, audit);
    await batch.commit();
}

/** Validate and update the selected enrollment while retaining its document ID. */
export async function updateEnrollment(id: string, input: EnrollmentDraft): Promise<void> {
    const uid = await requireAdministrator();
    assertStatus(input.status);
    const reference = doc(db, 'enrollments', id);
    const existing = await getDocFromServer(reference);
    if (!existing.exists()) throw new Error('La inscripción ya no existe.');
    if (existing.data().studentId !== input.studentId || existing.data().courseId !== input.courseId)
        throw new Error('Para cambiar de curso usá la opción de traslado, conservando el historial.');
    if (existing.data().status === 'transferred')
        throw new Error('Una inscripción trasladada debe conservar su historial.');
    const startDate = calendarDate(input.startDate, true);
    if (input.completionNotes.length > 3000) throw new Error('Las observaciones superan el límite de caracteres.');
    await ensureCourseCapacity(input.courseId, input.status, id);
    const course = await getDocFromServer(doc(db, 'courses', input.courseId));
    const audit = await prepareAuditEntry('enrollment.updated', String(course.data()?.name ?? 'curso'));
    const batch = writeBatch(db);
    batch.update(reference, {
        startDate,
        status: input.status,
        courseworkCompleted: triState(input.courseworkCompleted),
        courseCompleted: triState(input.courseCompleted),
        completionNotes: input.completionNotes.trim(),
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    });
    auditInBatch(batch, audit);
    await batch.commit();
}

/** Preserve historical enrollment and create a linked transfer destination. */
export async function transferEnrollment(enrollmentId: string, input: TransferDraft): Promise<void> {
    const uid = await requireAdministrator();
    if (!input.toCourseId) throw new Error('Seleccioná el nuevo curso.');
    const startDate = calendarDate(input.startDate, true);
    if (input.reason.length > 1000) throw new Error('El motivo del traslado es demasiado extenso.');
    const previous = doc(db, 'enrollments', enrollmentId);
    const before = await getDocFromServer(previous);
    if (!before.exists()) throw new Error('La inscripción original ya no existe.');
    const old = before.data();
    if (old.courseId === input.toCourseId) throw new Error('Seleccioná un curso diferente.');
    if (['completed', 'withdrawn', 'transferred'].includes(old.status))
        throw new Error('Esta inscripción ya terminó o fue trasladada.');
    await ensureEnrollmentAllowed(old.studentId, input.toCourseId, input.startDate);
    await ensureCourseCapacity(input.toCourseId, 'active');
    // The transaction also verifies that another administrator has not transferred
    // or completed the source enrollment between the preflight and the write.
    const next = doc(collection(db, 'enrollments'));
    const destination = await getDocFromServer(doc(db, 'courses', input.toCourseId));
    const audit = await prepareAuditEntry('enrollment.transferred', String(destination.data()?.name ?? 'curso'));
    await runTransaction(db, async transaction => {
        const latest = await transaction.get(previous);
        const target = await transaction.get(doc(db, 'courses', input.toCourseId));
        const student = await transaction.get(doc(db, 'students', old.studentId));
        if (!latest.exists() || !target.exists() || !student.exists())
            throw new Error('Alguno de los registros ya no existe.');
        if (!target.data().active || student.data().active === false)
            throw new Error('El nuevo curso o el alumno está inactivo.');
        const current = latest.data();
        if (['completed', 'withdrawn', 'transferred'].includes(current.status)
            || current.courseId !== old.courseId
            || current.studentId !== old.studentId)
            throw new Error('La inscripción original cambió. Actualizá antes de trasladarla.');
        transaction.update(previous, {
            status: 'transferred',
            transferredToEnrollmentId: next.id,
            transferReason: input.reason.trim(),
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });
        transaction.set(next, {
            studentId: old.studentId,
            courseId: input.toCourseId,
            startDate,
            status: 'active',
            courseworkCompleted: null,
            courseCompleted: null,
            completionNotes: '',
            transferFromEnrollmentId: enrollmentId,
            transferReason: input.reason.trim(),
            source: 'manual-transfer',
            createdAt: serverTimestamp(),
            createdBy: uid,
            updatedAt: serverTimestamp(),
            updatedBy: uid,
        });
        auditInTransaction(transaction, audit);
    });
}

export function studentDraft(student?: AcademyStudent): StudentDraft {
    return {
        fullName: student?.fullName ?? '',
        firstName: student?.firstName ?? '',
        lastName: student?.lastName ?? '',
        dni: student?.dni ?? '',
        birthDate: student?.birthDate ?? '',
        birthPlace: student?.birthPlace ?? '',
        nationalityCode: student?.nationalityCode ?? '',
        phone: student?.phone ?? '',
        email: student?.email ?? '',
        address: student?.address ?? '',
        city: student?.city ?? '',
        active: student?.active === null || student === undefined ? 'unknown' : student.active ? 'true' : 'false',
    };
}

export function writeError(error: unknown): string {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'Firestore rechazó la operación. Comprobá tu sesión de administrador.';
    if (code === 'unavailable') return 'No hay conexión con Firestore. No se confirmó ningún cambio.';
    return error instanceof Error && !code ? error.message : 'No se pudo guardar. Revisá los datos e intentá nuevamente.';
}
