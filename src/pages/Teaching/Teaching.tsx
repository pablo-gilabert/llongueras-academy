/** Tutor-only, read-only assigned course overview. */
import { useEffect, useState } from 'react';
import { BookOpenCheck, ShieldCheck } from 'lucide-react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/Firebase';
import { EmptyState, PageTitle, Panel, Pill } from '../../components/Common/Common';
import { t } from '../../i18n/Translations';
import Styles from './Teaching.module.css';

interface AssignedCourse {
    id: string;
    name: string;
    active: boolean;
}

interface TeacherInfo {
    fullName: string;
    specialty: string;
    courseIds: string[];
}

export function Teaching() {
    const { user } = useAuth();
    const teacherId = user?.role === 'tutor' ? user.teacherId : undefined;
    const [teacher, setTeacher] = useState<TeacherInfo | null>(null);
    const [courses, setCourses] = useState<AssignedCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!teacherId) {
            setLoading(false);
            setError('No se encontró una ficha docente vinculada a esta cuenta.');
            return;
        }

        let active = true;
        let revision = 0;

        const stop = onSnapshot(doc(db, 'teachers', teacherId), snapshot => {
            const current = ++revision;
            if (!snapshot.exists() || snapshot.data().active !== true || snapshot.data().authUid !== user?.id) {
                setTeacher(null);
                setCourses([]);
                setLoading(false);
                setError('Tu ficha docente ya no está habilitada. Consultá a la administración.');
                return;
            }

            const data = snapshot.data();
            const courseIds: string[] = Array.isArray(data.courseIds)
                ? [...new Set(data.courseIds.filter((id: unknown): id is string => typeof id === 'string' && Boolean(id.trim())))]
                : [];

            setTeacher({
                fullName: typeof data.fullName === 'string' ? data.fullName : 'Docente',
                specialty: typeof data.specialty === 'string' ? data.specialty : '',
                courseIds,
            });
            setLoading(true);
            setError('');

            // Individual document reads match the rule that checks each course ID.
            void Promise.all(courseIds.map(async courseId => {
                const courseDoc = await getDocFromServer(doc(db, 'courses', courseId));
                if (!courseDoc.exists())
                    return null;
                return {
                    id: courseDoc.id,
                    name: typeof courseDoc.data().name === 'string' ? courseDoc.data().name : 'Curso',
                    active: courseDoc.data().active === true,
                };
            })).then(results => {
                if (!active || current !== revision)
                    return;
                setCourses(results.filter((course): course is AssignedCourse => course !== null)
                    .sort((a, b) => a.name.localeCompare(b.name, 'es')));
                setLoading(false);
            }).catch(() => {
                if (!active || current !== revision)
                    return;
                setCourses([]);
                setError('No fue posible consultar los cursos asignados. Revisá los permisos de Firebase.');
                setLoading(false);
            });
        }, () => {
            if (!active)
                return;
            setTeacher(null);
            setCourses([]);
            setLoading(false);
            setError('Firebase no autorizó la lectura de la ficha docente.');
        });

        return () => {
            active = false;
            stop();
        };
    }, [teacherId, user?.id]);

    return <>
        <PageTitle
            kicker={t('CAMPUS DOCENTE')}
            title={t('Mis cursos asignados')}
            description={t('Consultá los cursos que la administración vinculó a tu ficha docente.')}
        />
        <div className={Styles.notice}>
            <ShieldCheck size={18} aria-hidden="true" />
            <span>{t('Acceso docente de solo lectura. Las fichas de alumnos y sus datos personales permanecen restringidos.')}</span>
        </div>
        {error && <p className={Styles.error} role="alert">{t(error)}</p>}
        {loading && <p className={Styles.note} role="status">{t('Consultando cursos autorizados…')}</p>}
        {!loading && !error && teacher && <>
            <Panel title={teacher.fullName} subtitle={teacher.specialty || t('Ficha docente verificada')}>
                <div className={Styles.summary}>
                    <BookOpenCheck size={19} aria-hidden="true" />
                    <span>{teacher.courseIds.length} {t('cursos asignados')}</span>
                </div>
            </Panel>
            <Panel title={t('Mis cursos asignados')} subtitle={t('Registros de la academia')}>
                {!courses.length ? <EmptyState
                    title={t('Sin cursos asignados')}
                    message={t('La administración todavía no te asignó ningún curso.')}
                /> : <div className={Styles.courseList}>
                    {courses.map(course => <div className={Styles.course} key={course.id}>
                        <div>
                            <BookOpenCheck size={19} aria-hidden="true" />
                            <strong>{course.name}</strong>
                        </div>
                        <Pill tone={course.active ? 'success' : 'warning'}>{t(course.active ? 'Activo' : 'Inactivo')}</Pill>
                    </div>)}
                </div>}
            </Panel>
        </>}
    </>;
}
