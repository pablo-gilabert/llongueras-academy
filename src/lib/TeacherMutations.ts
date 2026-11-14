/** Administrator-only teacher profile maintenance. */
import {
    collection,
    doc,
    getDocFromServer,
    getDocsFromServer,
    query,
    serverTimestamp,
    writeBatch,
    where,
} from 'firebase/firestore';
import { auth, db } from './Firebase';
import { prepareAuditEntry, auditInBatch } from './AuditLog';
import type { AcademyTeacher } from '../context/AcademyContext';

export interface TeacherDraft {
    fullName: string;
    email: string;
    phone: string;
    specialty: string;
    active: boolean;
    courseIds: string[];
}

export const teacherDraft = (teacher?: AcademyTeacher): TeacherDraft => ({
    fullName: teacher?.fullName ?? '',
    email: teacher?.email ?? '',
    phone: teacher?.phone ?? '',
    specialty: teacher?.specialty ?? '',
    active: teacher?.active ?? true,
    courseIds: [...(teacher?.courseIds ?? [])],
});

const normalize = (value: string) => value.trim().replace(/\s+/g, ' ');

async function requireAdministrator(): Promise<string> {
    const user = auth.currentUser;
    if (!user || (await user.getIdTokenResult()).claims.role !== 'admin')
        throw new Error('Tu sesión no tiene permisos de administrador. Volvé a iniciar sesión.');
    return user.uid;
}

/** Manage teacher profiles and course assignments without provisioning Auth users. */
export async function saveTeacher(input: TeacherDraft, teacherId?: string): Promise<void> {
    const uid = await requireAdministrator();
    const fullName = normalize(input.fullName);
    const email = input.email.trim().toLowerCase();
    const phone = normalize(input.phone);
    const specialty = normalize(input.specialty);

    if (fullName.length < 3 || fullName.length > 160)
        throw new Error('Ingresá un nombre completo de entre 3 y 160 caracteres.');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw new Error('Ingresá un correo electrónico válido.');
    if (phone.length > 80 || specialty.length > 160)
        throw new Error('Revisá la longitud del teléfono o especialidad.');
    if (!Array.isArray(input.courseIds) || input.courseIds.some(id => typeof id !== 'string'))
        throw new Error('La selección de cursos no es válida.');

    // Check for collisions with existing real profiles; empty email is allowed.
    if (email) {
        const matches = await getDocsFromServer(query(collection(db, 'teachers'), where('email', '==', email)));
        if (matches.docs.some(item => item.id !== teacherId))
            throw new Error('Ya existe un docente con ese correo electrónico.');
    }

    let existingCourseIds: string[] = [];
    if (teacherId) {
        const existing = await getDocFromServer(doc(db, 'teachers', teacherId));
        if (!existing.exists())
            throw new Error('La ficha del docente ya no existe. Actualizá la página.');
        existingCourseIds = Array.isArray(existing.data().courseIds) ? existing.data().courseIds : [];
    }

    const courseIds = [...new Set(input.courseIds)];
    if (courseIds.length) {
        // Verify course assignments against current Firestore IDs before persisting them.
    const courses = await getDocsFromServer(collection(db, 'courses'));
        const known = new Map(courses.docs.map(item => [item.id, item.data().active === true]));
        for (const courseId of courseIds) {
            if (!known.has(courseId))
                throw new Error('Uno de los cursos seleccionados ya no existe.');
            if (!known.get(courseId) && !existingCourseIds.includes(courseId))
                throw new Error('No se pueden asignar cursos inactivos.');
        }
    }

    const fields = {
        fullName,
        email: email || null,
        phone: phone || null,
        specialty: specialty || null,
        active: input.active,
        courseIds,
        updatedAt: serverTimestamp(),
        updatedBy: uid,
    };

    const audit = await prepareAuditEntry(teacherId ? 'teacher.updated' : 'teacher.created', fullName);
    const batch = writeBatch(db);
    if (teacherId) {
        batch.update(doc(db, 'teachers', teacherId), fields);
    } else {
        // Creating a profile does NOT create or enable a Firebase Authentication user.
        batch.set(doc(collection(db, 'teachers')), {
            ...fields,
            source: 'manual-campus',
            createdAt: serverTimestamp(),
            createdBy: uid,
        });
    }
    auditInBatch(batch, audit);
    await batch.commit();
}
