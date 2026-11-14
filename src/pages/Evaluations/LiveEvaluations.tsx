/** Private evaluation creation and enrollment-level grade editor. */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, Plus, Save, Users } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { EmptyState, PageTitle, Panel, Pill } from '../../components/Common/Common';
import { useAcademy } from '../../context/AcademyContext';
import { t } from '../../i18n/Translations';
import { createRealEvaluation, saveRealGrades } from '../../lib/EvaluationMutations';
import type { GradeChange, RealEvaluation, RealGrade } from '../../lib/EvaluationMutations';
import { db } from '../../lib/Firebase';
import { isoDay } from '../../lib/Utils';
import Styles from './LiveEvaluations.module.css';

interface DraftGrade {
    score: string;
    feedback: string;
}

const eligibleStatuses = new Set(['active', 'paused', 'pending_review', 'completed']);

function parseEvaluation(id: string, fields: DocumentData): RealEvaluation | null {
    if (typeof fields.courseId !== 'string' || typeof fields.title !== 'string' ||
        typeof fields.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date) ||
        typeof fields.maxScore !== 'number' || !Number.isFinite(fields.maxScore) || fields.maxScore <= 0)
        return null;
    return {
        id,
        courseId: fields.courseId,
        title: fields.title,
        date: fields.date,
        maxScore: fields.maxScore,
        description: typeof fields.description === 'string' ? fields.description : '',
    };
}

function parseGrade(fields: DocumentData): RealGrade | null {
    if (typeof fields.evaluationId !== 'string' || typeof fields.enrollmentId !== 'string' ||
        typeof fields.studentId !== 'string' || typeof fields.courseId !== 'string' ||
        typeof fields.score !== 'number' || !Number.isFinite(fields.score))
        return null;
    return {
        evaluationId: fields.evaluationId,
        enrollmentId: fields.enrollmentId,
        studentId: fields.studentId,
        courseId: fields.courseId,
        score: fields.score,
        feedback: typeof fields.feedback === 'string' ? fields.feedback : '',
    };
}

function readableError(error: unknown): string {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'permission-denied')
        return 'Firebase rechazó el acceso. Revisá las reglas de evaluations y grades, y tu sesión de administrador.';
    if (code === 'unavailable') return 'No se pudo conectar con Firestore. Revisá tu conexión.';
    return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

const formatDate = (value: string): string => {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
};

/** Subscribe to course assessments and selected evaluation grades. */
export function LiveEvaluations() {
    const { courses, students, enrollments } = useAcademy();
    const [courseId, setCourseId] = useState('');
    const [evaluationId, setEvaluationId] = useState('');
    const [evaluations, setEvaluations] = useState<RealEvaluation[]>([]);
    const [grades, setGrades] = useState<RealGrade[]>([]);
    const [draft, setDraft] = useState<Record<string, DraftGrade>>({});
    const [evaluationsLoading, setEvaluationsLoading] = useState(true);
    const [gradesLoading, setGradesLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [gradeError, setGradeError] = useState('');
    const [formError, setFormError] = useState('');
    const [success, setSuccess] = useState('');
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(isoDay());
    const [maxScore, setMaxScore] = useState('10');
    const [description, setDescription] = useState('');

    const courseOptions = useMemo(() => courses.items.slice().sort((a, b) =>
        a.name.localeCompare(b.name, 'es')), [courses.items]);
    const selectedCourseId = courseOptions.some(course => course.id === courseId)
        ? courseId : (courseOptions.find(course => course.active)?.id ?? courseOptions[0]?.id ?? '');
    const selectedCourse = courseOptions.find(course => course.id === selectedCourseId);

    useEffect(() => {
        setEvaluations([]);
        setEvaluationId('');
        setGrades([]);
        setLoadError('');
        setSuccess('');
        if (!selectedCourseId) {
            setEvaluationsLoading(false);
            return;
        }
        setEvaluationsLoading(true);
        return onSnapshot(query(collection(db, 'evaluations'), where('courseId', '==', selectedCourseId)), snapshot => {
            const items = snapshot.docs.map(item => parseEvaluation(item.id, item.data()))
                .filter((item): item is RealEvaluation => item !== null)
                .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'es'));
            setEvaluations(items);
            setLoadError('');
            setEvaluationsLoading(false);
        }, error => {
            setLoadError(readableError(error));
            setEvaluationsLoading(false);
        });
    }, [selectedCourseId]);

    const selected = evaluations.find(item => item.id === evaluationId) ?? evaluations[0];

    useEffect(() => {
        setGrades([]);
        setDraft({});
        setGradeError('');
        setSuccess('');
        if (!selected?.id) {
            setGradesLoading(false);
            return;
        }
        setGradesLoading(true);
        return onSnapshot(query(collection(db, 'grades'), where('evaluationId', '==', selected.id)), snapshot => {
            setGrades(snapshot.docs.map(item => parseGrade(item.data()))
                .filter((item): item is RealGrade => item !== null));
            setGradeError('');
            setGradesLoading(false);
        }, error => {
            setGradeError(readableError(error));
            setGradesLoading(false);
        });
    }, [selected?.id]);

    const studentsById = useMemo(() => new Map(students.items.map(student => [student.id, student])), [students.items]);
    const roster = useMemo(() => enrollments.items
        .filter(enrollment => enrollment.courseId === selectedCourseId &&
            eligibleStatuses.has(enrollment.status) &&
            (!selected || !enrollment.startDate || enrollment.startDate <= selected.date) &&
            studentsById.has(enrollment.studentId))
        .sort((a, b) => (studentsById.get(a.studentId)?.fullName ?? '').localeCompare(
            studentsById.get(b.studentId)?.fullName ?? '', 'es')),
    [enrollments.items, selectedCourseId, studentsById, selected]);

    const savedByEnrollment = useMemo(() => new Map(grades.map(grade => [grade.enrollmentId, grade])), [grades]);

    useEffect(() => {
        const next: Record<string, DraftGrade> = {};
        roster.forEach(enrollment => {
            const saved = savedByEnrollment.get(enrollment.id);
            next[enrollment.id] = { score: saved ? String(saved.score) : '', feedback: saved?.feedback ?? '' };
        });
        setDraft(next);
    }, [roster, savedByEnrollment]);

    const invalidGrade = useMemo(() => roster.some(enrollment => {
        const value = draft[enrollment.id]?.score.trim() ?? '';
        const saved = savedByEnrollment.get(enrollment.id);
        if (!value) return Boolean(saved);
        const score = Number(value);
        return !Number.isFinite(score) || score < 0 || score > (selected?.maxScore ?? 0) ||
            Math.abs(Math.round(score * 100) - score * 100) > 1e-8;
    }), [roster, draft, savedByEnrollment, selected?.maxScore]);

    const changes = useMemo<GradeChange[]>(() => roster.flatMap(enrollment => {
        const current = draft[enrollment.id];
        if (!current?.score.trim()) return [];
        const score = Number(current.score);
        const feedback = current.feedback.trim();
        const saved = savedByEnrollment.get(enrollment.id);
        if (saved?.score === score && saved.feedback === feedback) return [];
        return [{
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            score,
            feedback,
            expectedScore: saved?.score ?? null,
            expectedFeedback: saved?.feedback ?? '',
        }];
    }), [roster, draft, savedByEnrollment]);

    const isLoading = courses.loading || students.loading || enrollments.loading || evaluationsLoading || gradesLoading;
    const loadProblem = courses.error || students.error || enrollments.error || loadError || gradeError;
    const gradeCount = roster.filter(enrollment => savedByEnrollment.has(enrollment.id)).length;
    const canGrade = selected && selected.date <= isoDay();

    const createEvaluation = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (creating || saving || !selectedCourseId || selectedCourse?.active !== true) return;
        setCreating(true);
        setFormError('');
        setSuccess('');
        try {
            const id = await createRealEvaluation({
                courseId: selectedCourseId,
                title,
                date,
                maxScore: Number(maxScore),
                description,
            });
            setEvaluationId(id);
            setTitle('');
            setDescription('');
            setDate(isoDay());
            setMaxScore('10');
            setShowCreate(false);
            setSuccess('La evaluación se creó correctamente.');
        } catch (error) {
            setFormError(readableError(error));
        } finally {
            setCreating(false);
        }
    };

    const saveGrades = async () => {
        if (saving || isLoading || loadProblem || !selected || !canGrade || !changes.length) return;
        setSuccess('');
        setGradeError('');
        if (invalidGrade) {
            setGradeError('Revisá las notas: deben estar dentro de la escala. No se pueden borrar notas guardadas desde esta pantalla.');
            return;
        }
        setSaving(true);
        try {
            const count = await saveRealGrades({ evaluation: selected, changes });
            setSuccess(`${count} calificaciones guardadas correctamente.`);
        } catch (error) {
            setGradeError(readableError(error));
        } finally {
            setSaving(false);
        }
    };

    return <>
        <PageTitle kicker={t('SEGUIMIENTO ACADÉMICO')}
            title={t('Evaluaciones')}
            description={t('Creá evaluaciones de los cursos y registrá las calificaciones por inscripción.')} />
        <div className={Styles.notice}>{t('Este libro de notas es privado. Solo los administradores pueden consultar y modificar calificaciones.')}</div>
        <Panel title={t('Libro de calificaciones · Firebase')}
            subtitle={t('Elegí un curso y una evaluación. Las notas no se generan automáticamente.') }>
            <div className={Styles.toolbar}>
                <label className={Styles.field}>
                    <span>{t('Curso')}</span>
                    <select value={selectedCourseId} disabled={saving || creating || courses.loading || !courseOptions.length}
                        onChange={event => { setCourseId(event.target.value); setShowCreate(false); setGradeError(''); setSuccess(''); }}>
                        {courseOptions.map(course => <option key={course.id} value={course.id}>{course.name}{course.active ? '' : ' (inactivo)'}</option>)}
                    </select>
                </label>
                <label className={Styles.field}>
                    <span>{t('Evaluación')}</span>
                    <select value={selected?.id ?? ''} disabled={saving || creating || evaluationsLoading || !evaluations.length}
                        onChange={event => { setEvaluationId(event.target.value); setGradeError(''); setSuccess(''); }}>
                        {evaluations.length ? evaluations.map(item => <option key={item.id} value={item.id}>{item.title} · {formatDate(item.date)}</option>) : <option value="">{t('No hay evaluaciones registradas')}</option>}
                    </select>
                </label>
            </div>
            <div className={Styles.actions}>
                <button type="button" className={Styles.secondary}
                    onClick={() => { setShowCreate(value => !value); setFormError(''); }}
                    disabled={saving || creating || !selectedCourseId || selectedCourse?.active !== true}>
                    <Plus size={16} /> {t('Agregar evaluación académica')}
                </button>
            </div>
            {showCreate && <form className={Styles.createForm} onSubmit={createEvaluation}>
                <h3>{t('Crear evaluación')}</h3>
                <div className={Styles.formGrid}>
                    <label className={Styles.field}><span>{t('Título')}</span>
                        <input required minLength={3} maxLength={160} value={title} onChange={event => setTitle(event.target.value)} placeholder={t('Ej.: Práctica de corte')} disabled={creating} />
                    </label>
                    <label className={Styles.field}><span>{t('Fecha')}</span>
                        <input type="date" required value={date} onChange={event => setDate(event.target.value)} disabled={creating} />
                    </label>
                    <label className={Styles.field}><span>{t('Nota máxima')}</span>
                        <input type="number" required min="1" max="100" step="0.01" value={maxScore} onChange={event => setMaxScore(event.target.value)} disabled={creating} />
                    </label>
                    <label className={Styles.field}><span>{t('Descripción opcional')}</span>
                        <input maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} disabled={creating} />
                    </label>
                </div>
                {formError && <p className={Styles.error} role="alert">{t(formError)}</p>}
                <div className={Styles.actions}>
                    <button type="button" className={Styles.secondary} onClick={() => setShowCreate(false)} disabled={creating}>{t('Cancelar')}</button>
                    <button type="submit" className={Styles.primary} disabled={creating}><Plus size={16} /> {creating ? t('Guardando…') : t('Crear evaluación')}</button>
                </div>
            </form>}
            {loadProblem && <p className={Styles.error} role="alert">{t(loadProblem)}</p>}
            {isLoading && <p className={Styles.muted} role="status">{t('Cargando información académica…')}</p>}
            {!isLoading && !loadProblem && !selectedCourseId && <EmptyState title={t('Todavía no hay cursos registrados')} />}
            {!isLoading && !loadProblem && selectedCourseId && !selected && <EmptyState title={t('No hay evaluaciones registradas')}
                message={t('Creá la primera evaluación para empezar a registrar notas de este curso.')} />}
            {!isLoading && !loadProblem && selected && <>
                <div className={Styles.summary}>
                    <div><ClipboardCheck size={16} /> <strong>{selected.title}</strong> · {formatDate(selected.date)} · {t('Máximo')}: {selected.maxScore}</div>
                    <div><Users size={16} /> <strong>{roster.length}</strong> {t('inscripciones disponibles')}</div>
                    <div><CheckCircle2 size={16} /> <strong>{gradeCount}</strong> {t('notas cargadas')}</div>
                </div>
                {selected.description && <p className={Styles.muted}>{selected.description}</p>}
                {!canGrade && <p className={Styles.notice}>{t('La evaluación está programada para una fecha futura. Se podrán cargar notas a partir de esa fecha.')}</p>}
                <div className="tableWrap">
                    <table className="dataTable">
                        <thead><tr><th>{t('Alumno')}</th><th>{t('Estado de inscripción')}</th><th>{t('Calificación')}</th><th>{t('Observaciones')}</th></tr></thead>
                        <tbody>{roster.map(enrollment => {
                            const student = studentsById.get(enrollment.studentId)!;
                            const grade = savedByEnrollment.get(enrollment.id);
                            const current = draft[enrollment.id] ?? { score: '', feedback: '' };
                            return <tr key={enrollment.id}>
                                <td><strong>{student.fullName}</strong></td>
                                <td><Pill tone={enrollment.status === 'active' ? 'success' : 'warning'}>{t(enrollment.status === 'active' ? 'Activo' : enrollment.status === 'paused' ? 'Pausado' : enrollment.status === 'completed' ? 'Finalizado' : 'A revisar')}</Pill></td>
                                <td><label className={Styles.field}>
                                    <span className={Styles.srOnly}>{t('Nota')}: {student.fullName}</span>
                                    <input type="number" min="0" max={selected.maxScore} step="0.01" placeholder={t('Sin calificar')}
                                        value={current.score} disabled={saving || !canGrade}
                                        onChange={event => { setDraft(previous => ({ ...previous, [enrollment.id]: { ...current, score: event.target.value } })); setSuccess(''); setGradeError(''); }} />
                                </label>{grade && <span className={Styles.muted}>{t('Nota guardada')}: {grade.score}/{selected.maxScore}</span>}</td>
                                <td><input className={Styles.feedback} type="text" maxLength={500} placeholder={t('Observación opcional')}
                                    aria-label={`${t('Observaciones')}: ${student.fullName}`}
                                    value={current.feedback} disabled={saving || !canGrade}
                                    onChange={event => { setDraft(previous => ({ ...previous, [enrollment.id]: { ...current, feedback: event.target.value } })); setSuccess(''); setGradeError(''); }} /></td>
                            </tr>;
                        })}</tbody>
                    </table>
                    {!roster.length && <EmptyState title={t('No hay inscripciones disponibles para esta evaluación')} />}
                </div>
                <div className={Styles.actions}>
                    <span className={Styles.muted}>{changes.length} {t('notas pendientes')}</span>
                    <button type="button" className={Styles.primary} onClick={saveGrades}
                        disabled={saving || invalidGrade || !canGrade || !changes.length || changes.length > 150}>
                        <Save size={16} /> {saving ? t('Guardando…') : t('Guardar calificaciones del curso')}
                    </button>
                </div>
                {invalidGrade && <p className={Styles.error} role="alert">{t('Revisá las notas: deben estar dentro de la escala. No se pueden borrar notas guardadas desde esta pantalla.')}</p>}
                {gradeError && <p className={Styles.error} role="alert">{t(gradeError)}</p>}
            </>}
            {success && <p className={Styles.success} role="status"><CheckCircle2 size={16} /> {t(success)}</p>}
            <p className={Styles.muted}>{t('Las correcciones actualizan la misma nota por evaluación e inscripción. Los registros históricos no se eliminan.')}</p>
        </Panel>
    </>;
}
