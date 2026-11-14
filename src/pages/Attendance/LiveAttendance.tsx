/** Firestore-backed attendance editor and individual student saves. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck2, CheckCircle2, Save, Users } from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { EmptyState, PageTitle, Panel, Pill } from '../../components/Common/Common';
import { useAcademy } from '../../context/AcademyContext';
import { t } from '../../i18n/Translations';
import { saveLiveAttendance } from '../../lib/AttendanceMutations';
import type { LiveAttendanceStatus, AttendanceChange } from '../../lib/AttendanceMutations';
import { db } from '../../lib/Firebase';
import { isoDay } from '../../lib/Utils';
import Styles from './LiveAttendance.module.css';

interface SavedAttendance {
    enrollmentId: string;
    studentId: string;
    status: LiveAttendanceStatus;
    notes: string;
    lateMinutes: number | null;
}

interface DraftAttendance {
    status: LiveAttendanceStatus | '';
    notes: string;
    lateMinutes: number | null;
}

const statuses: { value: LiveAttendanceStatus; label: string }[] = [
    { value: 'present', label: 'Presente' },
    { value: 'absent', label: 'Ausente' },
    { value: 'justified', label: 'Justificada' },
    { value: 'late', label: 'Llegó tarde' },
];

const permittedStatuses = new Set(statuses.map(item => item.value));
const rosterStatuses = new Set(['active', 'paused', 'pending_review', 'completed']);

function parseRecord(fields: DocumentData): SavedAttendance | null {
    if (
        typeof fields.enrollmentId !== 'string' ||
        typeof fields.studentId !== 'string' ||
        !permittedStatuses.has(fields.status)
    ) return null;

    return {
        enrollmentId: fields.enrollmentId,
        studentId: fields.studentId,
        status: fields.status as LiveAttendanceStatus,
        notes: typeof fields.notes === 'string' ? fields.notes : '',
        lateMinutes: Number.isInteger(fields.lateMinutes) && fields.lateMinutes > 0 ? fields.lateMinutes : null,
    };
}

function friendlyError(error: unknown): string {
    const message = error instanceof Error ? error.message : '';
    const code = (error as { code?: string } | null)?.code;
    if (code === 'permission-denied')
        return 'Firebase rechazó la operación. Verificá las reglas de la colección attendance y tu sesión administrativa.';
    if (code === 'unavailable')
        return 'No se pudo contactar con Firestore. Verificá tu conexión.';
    return message || 'No fue posible guardar la asistencia. Intentá nuevamente.';
}

/** Display date-scoped attendance and save edits one student at a time. */
export function LiveAttendance() {
    const { courses, students, enrollments } = useAcademy();
    const [courseId, setCourseId] = useState('all');
    const [latePrompt, setLatePrompt] = useState<string | null>(null);
    const [minutesInput, setMinutesInput] = useState('');
    const [date, setDate] = useState(isoDay());
    const [records, setRecords] = useState<SavedAttendance[]>([]);
    const [draft, setDraft] = useState<Record<string, DraftAttendance>>({});
    // Track unsaved edits so Firestore snapshots never overwrite another student's form.
    const editedRows = useRef(new Set<string>());
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');
    const [successId, setSuccessId] = useState<string | null>(null);

    useEffect(() => {
        if (!successId) return;
        const timeout = window.setTimeout(() => setSuccessId(null), 1000);
        return () => window.clearTimeout(timeout);
    }, [successId]);

    const courseOptions = useMemo(() => courses.items.slice().sort((a, b) =>
        a.name.localeCompare(b.name, 'es')), [courses.items]);
    const selectedCourseId = courseId === 'all' ? 'all' : courseOptions.some(course => course.id === courseId) ? courseId : 'all';
    const studentsById = useMemo(() => new Map(students.items.map(item => [item.id, item])), [students.items]);
    const roster = useMemo(() => enrollments.items
        .filter(item => (selectedCourseId === 'all' || item.courseId === selectedCourseId) &&
            rosterStatuses.has(item.status) &&
            (!item.startDate || item.startDate <= date) &&
            studentsById.has(item.studentId) &&
            studentsById.get(item.studentId)?.active !== false)
        .sort((left, right) =>
            (studentsById.get(left.studentId)?.fullName ?? '').localeCompare(
                studentsById.get(right.studentId)?.fullName ?? '', 'es')),
    [enrollments.items, selectedCourseId, studentsById, date]);

    const sessionKeys = useMemo(() => (selectedCourseId === 'all' ? courseOptions.map(course => course.id) : [selectedCourseId])
        .filter(Boolean).map(id => `${id}__${date}`), [selectedCourseId, courseOptions, date]);
    const sessionKey = sessionKeys.join('|');

    useEffect(() => {
        if (!sessionKey) {
            setRecords([]);
            setDraft({});
            setLoading(false);
            return;
        }
        setLoading(true);
        setLoadError('');
        setRecords([]);
        editedRows.current.clear();
        setDraft({});

        // A single indexed key avoids loading the complete attendance history.
        // Listen to the selected date across all courses, without an 'in' query limit.
        return onSnapshot(query(collection(db, 'attendance'), where('date', '==', date)), snapshot => {
            setRecords(snapshot.docs.map(item => parseRecord(item.data())).filter((item): item is SavedAttendance => Boolean(item))
                .filter(item => roster.some(enrollment => enrollment.id === item.enrollmentId)));
            setLoadError('');
            setLoading(false);
        }, error => {
            setLoadError(friendlyError(error));
            setLoading(false);
        });
    }, [sessionKey, date, roster]);

    useEffect(() => {
        const next: Record<string, DraftAttendance> = {};
        roster.forEach(enrollment => {
            const existing = records.find(item => item.enrollmentId === enrollment.id);
            next[enrollment.id] = { status: existing?.status ?? '', notes: existing?.notes ?? '', lateMinutes: existing?.lateMinutes ?? null };
        });
        setDraft(previous => {
            const merged: Record<string, DraftAttendance> = {};
            roster.forEach(enrollment => {
                const id = enrollment.id;
                const local = previous[id];
                const saved = next[id];
                if (editedRows.current.has(id) && local) {
                    const matchesServer = local.status === saved.status &&
                        local.notes.trim() === saved.notes &&
                        (local.status === 'late' ? local.lateMinutes : null) === saved.lateMinutes;
                    if (matchesServer) editedRows.current.delete(id);
                    merged[id] = matchesServer ? saved : local;
                } else {
                    merged[id] = saved;
                }
            });
            return merged;
        });
    }, [roster, records]);

    const savedByEnrollment = useMemo(() => new Map(records.map(record => [record.enrollmentId, record])), [records]);
    const getChange = (enrollment: (typeof roster)[number]): AttendanceChange | null => {
        const current = draft[enrollment.id];
        const previous = savedByEnrollment.get(enrollment.id);
        if (!current) return null;
        const notes = current.notes.trim();
        const lateMinutes = current.status === 'late' ? current.lateMinutes : null;
        if ((previous?.status ?? '') === current.status && (previous?.notes ?? '') === notes &&
            (previous?.lateMinutes ?? null) === lateMinutes) return null;
        return {
            enrollmentId: enrollment.id,
            studentId: enrollment.studentId,
            courseId: enrollment.courseId,
            status: current.status || null,
            notes,
            lateMinutes,
            expectedStatus: previous?.status ?? null,
            expectedNotes: previous?.notes ?? '',
            expectedLateMinutes: previous?.lateMinutes ?? null,
        };
    };

    const reported = roster.filter(enrollment => savedByEnrollment.has(enrollment.id));
    const unresolved = roster.length - reported.length;
    // Keep the table mounted while saving a row to preserve the user's scroll position.
    const isBusy = courses.loading || students.loading || enrollments.loading || loading;
    const error = courses.error || students.error || enrollments.error || loadError;

    const saveRow = async (enrollment: (typeof roster)[number]) => {
        if (isBusy || savingId !== null || error) return;
        const change = getChange(enrollment);
        if (!change) return;
        setSavingId(enrollment.id);
        setSaveError('');
        setSuccessId(null);
        try {
            await saveLiveAttendance({ courseId: enrollment.courseId, date, changes: [change] });
            setSuccessId(enrollment.id);
        } catch (reason) {
            setSaveError(friendlyError(reason));
        } finally {
            setSavingId(null);
        }
    };

    return <>
        <PageTitle
            kicker={t('SEGUIMIENTO ACADÉMICO')}
            title={t('Control de asistencia')}
            description={t('Registrá la asistencia de los alumnos por curso y fecha.')}
        />
        <Panel title={t('Registro de asistencia')} subtitle={t('Elegí el curso y la fecha antes de marcar asistencia.')}>
            <div className={Styles.toolbar}>
                <label className={Styles.field}>
                    <span>{t('Carrera')}</span>
                    <select value={selectedCourseId} onChange={event => {
                        setCourseId(event.target.value);
                        setSuccessId(null);
                        setSaveError('');
                    }} disabled={isBusy || !courseOptions.length}>
                        <option value="all">Todas las carreras</option>
                        {courseOptions.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                    </select>
                </label>
                <label className={Styles.field}>
                    <span>{t('Fecha de clase')}</span>
                    <input type="date" value={date} max={isoDay()} onChange={event => {
                        setDate(event.target.value);
                        setSuccessId(null);
                        setSaveError('');
                    }} disabled={savingId !== null} />
                </label>
            </div>
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            {isBusy && savingId === null && <p className={Styles.muted} role="status">{t('Cargando información académica…')}</p>}
            {!courses.loading && !courseOptions.length && <EmptyState title={t('Todavía no hay cursos registrados')} />}
            {!isBusy && !error && selectedCourseId && <>
                <div className={Styles.summary}>
                    <div><Users size={16} /> <strong>{roster.length}</strong> {t('alumnos disponibles')}</div>
                    <div><CheckCircle2 size={16} /> <strong>{reported.length}</strong> {t('asistencias registradas')}</div>
                    <div><CalendarCheck2 size={16} /> <strong>{unresolved}</strong> {t('sin registrar')}</div>
                </div>
                <div className="tableWrap">
                    <table className={`dataTable ${Styles.attendanceTable}`}>
                        <thead><tr>
                            <th>{t('Alumno')}</th>
                            <th>{t('Carrera')}</th>
                            <th>{t('Estado de inscripción')}</th>
                            <th>{t('Asistencia')}</th>
                            <th>{t('Observación opcional')}</th>
                            <th>{t('Guardar')}</th>
                        </tr></thead>
                        <tbody>{roster.map(enrollment => {
                            const student = studentsById.get(enrollment.studentId)!;
                            const current = draft[enrollment.id] ?? { status: '', notes: '', lateMinutes: null };
                            const rowChange = getChange(enrollment);
                            return <tr key={enrollment.id} className={Styles.attendanceRow}>
                                <td><strong>{student.fullName}</strong></td>
                                <td>{courseOptions.find(course => course.id === enrollment.courseId)?.name ?? '—'}</td>
                                <td>
                                    <div className={Styles.enrollmentState}>
                                        <Pill tone={enrollment.status === 'active' ? 'success' : 'warning'}>{t(enrollment.status === 'active' ? 'Activo' : enrollment.status === 'paused' ? 'Pausado' : enrollment.status === 'completed' ? 'Finalizado' : 'A revisar')}</Pill>
                                        {current.status === 'late' && current.lateMinutes && <small className={Styles.lateLabel}>{current.lateMinutes} min de retraso</small>}
                                    </div>
                                </td>
                                <td>
                                    <div className={Styles.statusStack}>
                                    <select className={Styles.status} aria-label={`${t('Asistencia')}: ${student.fullName}`}
                                        value={current.status} onChange={event => {
                                            const status = event.target.value as LiveAttendanceStatus | '';
                                            if (status === 'late') {
                                                setLatePrompt(enrollment.id);
                                                setMinutesInput(current.lateMinutes ? String(current.lateMinutes) : '');
                                            } else {
                                                editedRows.current.add(enrollment.id);
                                                setDraft(previous => ({ ...previous, [enrollment.id]: { ...current, status, lateMinutes: null } }));
                                            }
                                            setSuccessId(null);
                                            setSaveError('');
                                        }}>
                                        <option value="">{t('Sin registrar')}</option>
                                        {statuses.map(option => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                                    </select>
                                    </div>
                                </td>
                                <td><input className={Styles.note} type="text" maxLength={300}
                                    aria-label={`${t('Observación opcional')}: ${student.fullName}`}
                                    placeholder={t('Sin observaciones')}
                                    value={current.notes} onChange={event => {
                                        editedRows.current.add(enrollment.id);
                                        setDraft(previous => ({ ...previous, [enrollment.id]: { ...current, notes: event.target.value } }));
                                        setSuccessId(null);
                                    }} /></td>
                                <td>
                                    <button type="button" className={Styles.rowSave}
                                        disabled={!rowChange || isBusy || savingId !== null || Boolean(error)}
                                        onClick={() => void saveRow(enrollment)}
                                        aria-label={`Guardar asistencia de ${student.fullName}`}>
                                        <Save size={16} aria-hidden="true" />
                                        {savingId === enrollment.id ? 'Guardando…' : 'Guardar'}
                                    </button>
                                </td>
                            </tr>;
                        })}</tbody>
                    </table>
                    {!roster.length && <EmptyState title={t('No hay inscripciones disponibles para esta fecha')} message={t('Revisá la fecha de inicio y el estado de las inscripciones del curso.')} />}
                </div>
                {successId && <div className={Styles.successToast} role="status">
                    <CheckCircle2 size={18} aria-hidden="true" /> Datos guardados correctamente
                </div>}
                {saveError && <p className={Styles.error} role="alert">{t(saveError)}</p>}
            </>}
        </Panel>
        {latePrompt && <div className={Styles.promptOverlay} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setLatePrompt(null); }}>
            <div className={Styles.promptCard} role="dialog" aria-modal="true" aria-labelledby="late-title">
                <div className={Styles.promptIcon}>!</div>
                <h2 id="late-title">¿Cuántos minutos llegó tarde?</h2>
                <p>Indicá los minutos de retraso del alumno.</p>
                <form onSubmit={event => {
                    event.preventDefault();
                    const minutes = Number(minutesInput);
                    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) return;
                    const enrollmentId = latePrompt;
                    editedRows.current.add(enrollmentId);
                    setDraft(previous => ({ ...previous, [enrollmentId]: {
                        ...previous[enrollmentId], status: 'late', lateMinutes: minutes,
                        notes: previous[enrollmentId]?.notes ?? '',
                    } }));
                    setLatePrompt(null);
                    setSuccessId(null);
                    setSaveError('');
                }}>
                    <input autoFocus type="number" min="1" max="1440" required value={minutesInput} onChange={event => setMinutesInput(event.target.value)} aria-label="Minutos de retraso" placeholder="Minutos" />
                    <div className={Styles.promptActions}>
                        <button type="button" onClick={() => setLatePrompt(null)}>Cancelar</button>
                        <button type="submit" className={Styles.promptConfirm}>Confirmar</button>
                    </div>
                </form>
            </div>
        </div>}
    </>;
}
