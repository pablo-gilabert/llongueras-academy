/** Live Firestore subscriptions for protected academic entities. */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { db } from '../lib/Firebase';
import { useAuth } from './AuthContext';

export interface AcademyCourse {
    id: string;
    name: string;
    active: boolean;
    modality: string | null;
    duration: string | null;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    capacity: number | null;
}

export interface AcademyStudent {
    id: string;
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    nameNeedsReview: boolean;
    dni: string;
    email: string | null;
    phone: string | null;
    birthDate: string | null;
    birthPlace: string | null;
    nationalityCode: string | null;
    address: string | null;
    city: string | null;
    active: boolean | null;
}

export interface AcademyTeacher {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    specialty: string | null;
    active: boolean;
    courseIds: string[];
    authUid: string | null;
}

export interface AcademyEnrollment {
    id: string;
    studentId: string;
    courseId: string;
    startDate: string | null;
    courseworkCompleted: boolean | null;
    courseCompleted: boolean | null;
    completionNotes: string;
    status: string;
    source: string | null;
    transferFromEnrollmentId: string | null;
    transferredToEnrollmentId: string | null;
    transferReason: string | null;
}

interface LiveCollection<T> {
    items: T[];
    loading: boolean;
    error: string | null;
}

interface AcademyContextValue {
    courses: LiveCollection<AcademyCourse>;
    students: LiveCollection<AcademyStudent>;
    enrollments: LiveCollection<AcademyEnrollment>;
    teachers: LiveCollection<AcademyTeacher>;
}

const empty = <T,>(): LiveCollection<T> => ({ items: [], loading: true, error: null });
const AcademyContext = createContext<AcademyContextValue | null>(null);

const text = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

const optionalBoolean = (value: unknown): boolean | null =>
    typeof value === 'boolean' ? value : null;

// Dates are serialized only in memory; private records are never persisted in browser storage.
/** Keep academic dates in a stable YYYY-MM-DD representation for form controls. */
function dateFromFirestore(value: unknown): string | null {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
    if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
        const date = (value.toDate as () => Date)();
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
    }
    return null;
}

/** Normalize possibly incomplete course documents without inventing their values. */
function readCourse(id: string, fields: DocumentData): AcademyCourse {
    return {
        id,
        name: text(fields.name) ?? 'Curso sin nombre',
        active: fields.active === true,
        modality: text(fields.modality),
        duration: text(fields.duration),
        description: text(fields.description),
        startDate: dateFromFirestore(fields.startDate),
        endDate: dateFromFirestore(fields.endDate),
        capacity: typeof fields.capacity === 'number' && Number.isSafeInteger(fields.capacity) && fields.capacity > 0
            ? fields.capacity
            : null,
    };
}

/** Preserve student identity and explicitly represent missing optional fields. */
function readStudent(id: string, fields: DocumentData): AcademyStudent {
    return {
        id,
        fullName: text(fields.fullName) ?? ([text(fields.firstName), text(fields.lastName)].filter(Boolean).join(' ') || 'Sin nombre'),
        firstName: text(fields.firstName),
        lastName: text(fields.lastName),
        nameNeedsReview: fields.nameNeedsReview === true,
        dni: text(fields.dni) ?? '',
        email: text(fields.email),
        phone: text(fields.phone),
        birthDate: dateFromFirestore(fields.birthDate),
        birthPlace: text(fields.birthPlace),
        nationalityCode: text(fields.nationalityCode),
        address: text(fields.address),
        city: text(fields.city),
        active: optionalBoolean(fields.active),
    };
}

/** Restrict course assignments to valid stored Firestore IDs. */
function readTeacher(id: string, fields: DocumentData): AcademyTeacher {
    return {
        id,
        fullName: text(fields.fullName) ?? 'Docente sin nombre',
        email: text(fields.email),
        phone: text(fields.phone),
        specialty: text(fields.specialty),
        active: fields.active !== false,
        authUid: text(fields.authUid),
        courseIds: Array.isArray(fields.courseIds)
            ? fields.courseIds.filter((courseId: unknown): courseId is string =>
                typeof courseId === 'string' && Boolean(courseId.trim()))
            : [],
    };
}

/** Keep historical transfer and completion metadata intact. */
function readEnrollment(id: string, fields: DocumentData): AcademyEnrollment {
    return {
        id,
        studentId: text(fields.studentId) ?? '',
        courseId: text(fields.courseId) ?? '',
        startDate: dateFromFirestore(fields.startDate),
        courseworkCompleted: optionalBoolean(fields.courseworkCompleted),
        courseCompleted: optionalBoolean(fields.courseCompleted),
        completionNotes: text(fields.completionNotes) ?? '',
        status: text(fields.status) ?? 'pending_review',
        source: text(fields.source),
        transferFromEnrollmentId: text(fields.transferFromEnrollmentId),
        transferredToEnrollmentId: text(fields.transferredToEnrollmentId),
        transferReason: text(fields.transferReason),
    };
}

function readableError(error: unknown): string {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'permission-denied')
        return 'Firebase rechazó el acceso. Volvé a iniciar sesión y comprobá las reglas de Firestore.';
    if (code === 'unavailable')
        return 'Firestore no está disponible en este momento. Revisá tu conexión.';
    return 'No se pudieron cargar los registros desde Firestore. Intentá nuevamente.';
}

/** Owns subscriptions for the authenticated campus and stops them on unmount. */
export function AcademyProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [courses, setCourses] = useState<LiveCollection<AcademyCourse>>(() => empty<AcademyCourse>());
    const [students, setStudents] = useState<LiveCollection<AcademyStudent>>(() => empty<AcademyStudent>());
    const [enrollments, setEnrollments] = useState<LiveCollection<AcademyEnrollment>>(() => empty<AcademyEnrollment>());
    const [teachers, setTeachers] = useState<LiveCollection<AcademyTeacher>>(() => empty<AcademyTeacher>());

    useEffect(() => {
        // Only the Firebase-verified administrator can mount live listeners.
        if (user?.role !== 'admin')
            return;

        const stopCourses = onSnapshot(collection(db, 'courses'), snapshot => {
            setCourses({ items: snapshot.docs.map(doc => readCourse(doc.id, doc.data())), loading: false, error: null });
        }, error => setCourses({ items: [], loading: false, error: readableError(error) }));

        const stopStudents = onSnapshot(collection(db, 'students'), snapshot => {
            setStudents({ items: snapshot.docs.map(doc => readStudent(doc.id, doc.data())), loading: false, error: null });
        }, error => setStudents({ items: [], loading: false, error: readableError(error) }));

        const stopTeachers = onSnapshot(collection(db, 'teachers'), snapshot => {
            setTeachers({ items: snapshot.docs.map(doc => readTeacher(doc.id, doc.data())), loading: false, error: null });
        }, error => setTeachers({ items: [], loading: false, error: readableError(error) }));

        const stopEnrollments = onSnapshot(collection(db, 'enrollments'), snapshot => {
            setEnrollments({ items: snapshot.docs.map(doc => readEnrollment(doc.id, doc.data())), loading: false, error: null });
        }, error => setEnrollments({ items: [], loading: false, error: readableError(error) }));

        return () => {
            stopCourses();
            stopStudents();
            stopEnrollments();
            stopTeachers();
        };
    }, [user?.id, user?.role]);

    return <AcademyContext.Provider value={{ courses, students, enrollments, teachers }}>
        {children}
    </AcademyContext.Provider>;
}

export function useAcademy() {
    const context = useContext(AcademyContext);
    if (!context)
        throw new Error('AcademyProvider is missing');
    return context;
}
