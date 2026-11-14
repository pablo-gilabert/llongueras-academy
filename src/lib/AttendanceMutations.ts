/** Transactional attendance updates and date-scoped academic tracking. */
import { doc, getDocFromServer, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './Firebase';
import { prepareAuditEntry, auditInTransaction } from './AuditLog';

export type LiveAttendanceStatus = 'present' | 'absent' | 'justified' | 'late';

export interface AttendanceChange {
    enrollmentId: string;
    studentId: string;
    courseId: string;
    lateMinutes: number | null;
    expectedLateMinutes: number | null;
    status: LiveAttendanceStatus | null;
    notes: string;
    expectedStatus: LiveAttendanceStatus | null;
    expectedNotes: string;
}

export interface AttendanceSave {
    courseId: string;
    date: string;
    changes: AttendanceChange[];
}

const statuses = new Set<LiveAttendanceStatus>(['present', 'absent', 'justified', 'late']);

function validDate(value: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const parsed = new Date(Date.UTC(year, month - 1, day, 12));
    return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function firestoreDay(value: unknown): string | null {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const date = (value.toDate as () => Date)();
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    }
    return null;
}

/** Persist only the selected attendance entry after rechecking live enrollment state. */
export async function saveLiveAttendance(input: AttendanceSave): Promise<number> {
    const user = auth.currentUser;
    if (!user || (await user.getIdTokenResult()).claims.role !== 'admin')
        throw new Error('Tu cuenta no tiene permisos administrativos para registrar asistencias.');

    const { courseId, date, changes } = input;
    if (!courseId || (courseId !== 'all' && !/^[\w-]+$/.test(courseId)) || !validDate(date))
        throw new Error('Seleccioná un curso y una fecha válidos.');
    const local = new Date();
    const localDay = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`;
    if (date > localDay)
        throw new Error('No se pueden registrar asistencias futuras.');
    if (!changes.length) throw new Error('Seleccioná al menos una asistencia para guardar.');
    if (changes.length > 300) throw new Error('Guardá la asistencia en grupos de hasta 300 alumnos.');

    const seen = new Set<string>();
    for (const entry of changes) {
        if (!/^[\w-]+$/.test(entry.enrollmentId) || !/^[\w-]+$/.test(entry.studentId))
            throw new Error('La inscripción o el alumno son inválidos.');
        if (seen.has(entry.enrollmentId)) throw new Error('Hay una inscripción repetida en la selección.');
        seen.add(entry.enrollmentId);
        if (!/^[\w-]+$/.test(entry.courseId) || (courseId !== 'all' && entry.courseId !== courseId))
            throw new Error('La carrera seleccionada no coincide con la inscripción.');
        if (entry.status === 'late' && (!Number.isInteger(entry.lateMinutes) || entry.lateMinutes === null || entry.lateMinutes < 1 || entry.lateMinutes > 1440))
            throw new Error('Ingresá los minutos de retraso.');
        if ((entry.status !== null && !statuses.has(entry.status)) || (entry.expectedStatus !== null && !statuses.has(entry.expectedStatus)))
            throw new Error('Hay un estado de asistencia inválido.');
        if (entry.notes.trim().length > 300)
            throw new Error('Una observación supera los 300 caracteres.');
    }

    const courseRefs = [...new Set(changes.map(entry => entry.courseId))].map(id => doc(db, 'courses', id));
    const currentCourse = await getDocFromServer(courseRefs[0]);
    const audit = await prepareAuditEntry(
        'attendance.saved', String(currentCourse.data()?.name ?? 'curso'),
        `${date} · ${changes.length} ${changes.length === 1 ? 'asistencia' : 'asistencias'}`,
    );
    const enrollmentRefs = changes.map(entry => doc(db, 'enrollments', entry.enrollmentId));
    const attendanceRefs = changes.map(entry => doc(db, 'attendance', `${entry.enrollmentId}_${date}`));

    // Reading all referenced documents first lets Firestore retry concurrent edits safely.
    await runTransaction(db, async transaction => {
        const courses = await Promise.all(courseRefs.map(reference => transaction.get(reference)));
        if (courses.some(course => !course.exists())) throw new Error('Una carrera ya no existe. Actualizá la página.');

        const enrollments = await Promise.all(
            enrollmentRefs.map(reference => transaction.get(reference))
        );

        const existingRecords = await Promise.all(
            attendanceRefs.map(reference => transaction.get(reference))
        );

        changes.forEach((entry, index) => {
            const enrollment = enrollments[index];
            if (!enrollment.exists() || enrollment.data().courseId !== entry.courseId || enrollment.data().studentId !== entry.studentId)
                throw new Error('Una inscripción cambió de curso o ya no existe. Actualizá la página.');
            if (['withdrawn', 'transferred'].includes(String(enrollment.data().status)))
                throw new Error('Una inscripción fue dada de baja o trasladada. Actualizá la página.');
            const startDay = firestoreDay(enrollment.data().startDate);
            if (startDay && date < startDay)
                throw new Error('La fecha es anterior al inicio de una inscripción.');

            const saved = existingRecords[index];
            const previousStatus = saved.exists() ? saved.data().status : null;
            const previousNotes = saved.exists() ? String(saved.data().notes ?? '') : '';
            const previousLateMinutes = saved.exists() && Number.isInteger(saved.data().lateMinutes) ? saved.data().lateMinutes : null;
            if (previousStatus !== entry.expectedStatus || previousNotes !== entry.expectedNotes || previousLateMinutes !== entry.expectedLateMinutes)
                throw new Error('Otro administrador modificó una asistencia. Revisá los nuevos datos antes de guardar.');
        });

        changes.forEach((entry, index) => {
            if (entry.status === null) {
                if (existingRecords[index].exists()) transaction.delete(attendanceRefs[index]);
                return;
            }
            transaction.set(attendanceRefs[index], {
                courseId: entry.courseId,
                studentId: entry.studentId,
                enrollmentId: entry.enrollmentId,
                date,
                sessionKey: `${courseId}__${date}`,
                status: entry.status,
                lateMinutes: entry.status === 'late' ? entry.lateMinutes : null,
                notes: entry.notes.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: user.uid,
                ...(existingRecords[index].exists() ? {} : {
                    createdAt: serverTimestamp(),
                    createdBy: user.uid,
                }),
            }, { merge: true });
        });
        auditInTransaction(transaction, audit);
    });

    return changes.length;
}
