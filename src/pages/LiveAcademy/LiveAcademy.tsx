/** Shared Firestore-backed student, course and enrollment views. */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Plus, Pencil } from 'lucide-react';
import { RealCourseEditor } from './RealCourseEditor';
import { EmptyState, Modal, PageTitle, Panel, Pill } from '../../components/Common/Common';
import { useAcademy } from '../../context/AcademyContext';
import { EnrollmentEditor, StudentEditor, TransferEditor } from './LiveAcademyForms';
import { t } from '../../i18n/Translations';
import { saveStudent, studentDraft, updateEnrollment, writeError } from '../../lib/AcademyMutations';
import type { StudentDraft, EnrollmentDraft, AcademicStatus } from '../../lib/AcademyMutations';
import Styles from './LiveAcademy.module.css';

export function DataMode() {
    return <div className={Styles.modeBar}>
        <span className={Styles.scopeNote}>{t('Información académica de acceso restringido.')}</span>
    </div>;
}

const displayDate = (value: string | null): string => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return '—';
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
};

const statusText = (status: string): string => {
    switch (status) {
        case 'active': return 'Cursando';
        case 'completed': return 'Finalizado';
        case 'paused': return 'Inactivo';
        case 'withdrawn': return 'Dado de baja';
        case 'transferred': return 'Trasladado';
        case 'pending_review': return 'A revisar';
        default: return 'A revisar';
    }
};

function LoadState({ loading, error }: { loading: boolean; error: string | null }) {
    if (loading)
        return <p className={Styles.hint} role="status">{t('Cargando registros de Firestore…')}</p>;
    if (error)
        return <p className={Styles.error} role="alert">{t(error)}</p>;
    return null;
}

/** Summarize actual Firestore records; only the monthly balance is illustrative. */
export function LiveOverview() {
    const { courses, students, enrollments } = useAcademy();
    return <section aria-label={t('Resumen académico')}>
        <div className={Styles.summaryFive}>
            {[
                { label: 'La academia cuenta con', value: students.error ? '—' : students.loading ? '…' : `${students.items.length} ${t('Alumnos')}` },
                { label: 'La academia ofrece', value: courses.error ? '—' : courses.loading ? '…' : `${courses.items.filter(course => course.active).length} ${t('Carreras')}` },
                { label: 'Sistema de asistencias', value: 'En construcción' },
                { label: 'La academia tiene', value: enrollments.error ? '—' : enrollments.loading ? '…' : `${enrollments.items.length} ${t('inscripciones registradas')}` },
                { label: 'Saldo mensual pendiente (inventado)', value: '$ 1.043.000' },
            ].map(item => <div className={Styles.summaryFiveCard} key={item.label}>
                <span>{t(item.label)}</span>
                <strong>{t(item.value)}</strong>
            </div>)}
        </div>
        {[courses.error, students.error, enrollments.error].filter(Boolean).map((error, index) =>
            <p className={Styles.error} key={index} role="alert">{t(error!)}</p>
        )}
        <div className={Styles.actions}>
            <Link className={Styles.actionLink} to="/app/courses">{t('Consultar cursos')} <ArrowRight size={14} /></Link>
            <Link className={Styles.actionLink} to="/app/students">{t('Consultar alumnos')} <ArrowRight size={14} /></Link>
            <Link className={Styles.actionLink} to="/app/enrollments">{t('Consultar inscripciones')} <ArrowRight size={14} /></Link>
        </div>
    </section>;
}

/** Filter the actual course catalog and derive rosters from enrollments. */
export function LiveCourses() {
    const { courses, enrollments, students, teachers } = useAcademy();
    const [search, setSearch] = useState('');
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
    const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
    const studentsById = useMemo(() => new Map(students.items.map(student => [student.id, student])), [students.items]);
    const sortedCourses = courses.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
    const shown = sortedCourses.filter(course =>
        `${course.name} ${course.modality ?? ''} ${course.description ?? ''}`
            .toLocaleLowerCase().includes(search.toLocaleLowerCase()));
    const selected = sortedCourses.find(course => course.id === selectedCourse);
    const roster = selected ? enrollments.items.filter(enrollment => enrollment.courseId === selected.id) : [];
    const editingCourse = sortedCourses.find(course => course.id === editingCourseId);
    const isOccupied = (status: string) => ['active', 'paused', 'pending_review'].includes(status);

    return <>
        <PageTitle
            kicker={t('OFERTA ACADÉMICA')}
            title={t('Cursos de la academia')}
            description={t('Administrá los seis cursos existentes en Firestore. Los datos sin confirmar pueden quedar vacíos.')}
        />
        <div className={Styles.hint}>
            {t('Podés editar el nombre, la descripción opcional y los demás datos de cada curso. Se conserva su ID y no se alteran las inscripciones existentes. Las materias y comisiones se gestionan por separado.')}
        </div>
        <div className={Styles.actions}>
            <input
                className={Styles.filter}
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder={t('Buscar cursos por nombre…')}
                aria-label={t('Buscar cursos')}
            />
            <span className={Styles.scopeNote}>{t('Cursos registrados')}: {courses.loading ? '…' : courses.items.length}</span>
        </div>
        <LoadState loading={courses.loading} error={courses.error} />
        {!courses.loading && !courses.error && <>
            <div className={Styles.courseCards}>
                {shown.map(course => {
                    const count = enrollments.items.filter(enrollment => enrollment.courseId === course.id).length;
                    const studentCount = new Set(enrollments.items.filter(enrollment => enrollment.courseId === course.id).map(enrollment => enrollment.studentId)).size;
                    return <article className={Styles.courseCard} key={course.id}>
                        <div className={Styles.courseCardHeader}>
                            <BookOpen size={23} aria-hidden="true" />
                            <span className={Styles.studentCount} aria-label={t('Cantidad de alumnos')}>
                                {enrollments.loading ? '…' : enrollments.error ? '—' : studentCount} {t(studentCount === 1 ? 'Alumno' : 'Alumnos')}
                            </span>
                        </div>
                        <h3>{course.name}</h3>
                        <Pill tone={course.active ? 'success' : 'warning'}>{t(course.active ? 'Disponible' : 'Inactivo')}</Pill>
                        <div className={Styles.courseDetails}>
                            <span><strong>{t('Modalidad')}:</strong> {course.modality ? t(course.modality) : t('A confirmar')}</span>
                            <span><strong>{t('Duración')}:</strong> {course.duration || t('A confirmar')}</span>
                            <span><strong>{t('Fechas')}:</strong> {course.startDate || course.endDate ? `${course.startDate ? displayDate(course.startDate) : t('A confirmar')} — ${course.endDate ? displayDate(course.endDate) : t('A confirmar')}` : t('A confirmar')}</span>
                            <span><strong>{t('Cupos')}:</strong> {course.capacity === null ? t('A confirmar') : enrollments.loading ? `… / ${course.capacity}` : enrollments.error ? `— / ${course.capacity}` : `${enrollments.items.filter(item => item.courseId === course.id && isOccupied(item.status)).length} / ${course.capacity}`}</span>
                            {course.description && <p>{course.description}</p>}
                        </div>
                        <p className={Styles.scopeNote}>
                            {t('Docentes asignados')}: {teachers.loading ? '…' : teachers.error ? '—' :
                                teachers.items.filter(teacher => teacher.active && teacher.courseIds.includes(course.id)).map(teacher => teacher.fullName).join(', ') || t('Sin docentes asignados')}
                        </p>
                        <div className={Styles.courseMeta}>
                            <span>{enrollments.loading ? '…' : enrollments.error ? '—' : count} {t('inscripciones')}</span>
                            <button type="button" className={Styles.tableLink} onClick={() => setSelectedCourse(course.id)}>
                                {t('Ver alumnos')}
                            </button>
                        </div>
                        <div className={Styles.courseActions}>
                            <Link className={Styles.actionLink} to={`/app/enrollments?course=${encodeURIComponent(course.id)}`}>
                                {t('Ver inscripciones')} <ArrowRight size={14} />
                            </Link>
                            <button
                                type="button"
                                className={Styles.secondaryButton}
                                disabled={courses.loading || Boolean(courses.error) || enrollments.loading || Boolean(enrollments.error)}
                                onClick={() => setEditingCourseId(course.id)}
                            >
                                <Pencil size={14} /> {t('Editar curso')}
                            </button>
                        </div>
                    </article>;
                })}
            </div>
            {!shown.length && <EmptyState title={t('Sin cursos')} message={t('No encontramos cursos con ese nombre.')} />}
        </>}
        {editingCourse && <RealCourseEditor
            key={editingCourse.id}
            course={editingCourse}
            enrollmentCount={enrollments.items.filter(item => item.courseId === editingCourse.id).length}
            occupied={enrollments.items.filter(item => item.courseId === editingCourse.id && isOccupied(item.status)).length}
            onClose={() => setEditingCourseId(null)}
        />}
        {selected && <Modal
            title={selected.name}
            subtitle={t('Alumnos vinculados por inscripciones registradas en Firestore.')}
            width="wide"
            onClose={() => setSelectedCourse(null)}
        >
            <LoadState loading={students.loading || enrollments.loading} error={students.error || enrollments.error} />
            {!students.loading && !enrollments.loading && !students.error && !enrollments.error && <div className="tableWrap">
                <table className="dataTable">
                    <thead><tr>
                        <th>{t('Alumno')}</th>
                        <th>{t('Fecha de inicio')}</th>
                        <th>{t('Estado')}</th>
                    </tr></thead>
                    <tbody>{roster.map(enrollment => <tr key={enrollment.id}>
                        <td>{studentsById.get(enrollment.studentId)?.fullName ?? t('Alumno sin ficha')}</td>
                        <td>{displayDate(enrollment.startDate)}</td>
                        <td>{t(statusText(enrollment.status))}</td>
                    </tr>)}</tbody>
                </table>
                {!roster.length && <EmptyState title={t('Sin inscripciones')} message={t('Todavía no hay alumnos vinculados a este curso.')} />}
            </div>}
        </Modal>}
    </>;
}

/** Display and edit actual student records without duplicating student identities. */
export function LiveStudents() {
    const { students, enrollments, courses } = useAcademy();
    const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'dni-asc' | 'dni-desc'>('name-asc');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'unknown'>('all');
    const [courseFilter, setCourseFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [studentEditorId, setStudentEditorId] = useState<string | null>(null);
    const [creatingStudent, setCreatingStudent] = useState(false);
    const [editingDetail, setEditingDetail] = useState<keyof StudentDraft | null>(null);
    const [detailValue, setDetailValue] = useState('');
    const [savingDetail, setSavingDetail] = useState(false);
    const [detailError, setDetailError] = useState('');

    const closeStudentDetails = () => {
        setSelectedStudentId(null);
        setEditingDetail(null);
        setDetailError('');
    };
    const startDetailEdit = (field: keyof StudentDraft, value: string) => {
        setEditingDetail(field);
        setDetailValue(value);
        setDetailError('');
    };
    const saveDetail = async () => {
        if (!selectedStudent || !editingDetail || savingDetail) return;
        const draft = studentDraft(selectedStudent);
        const nextDraft = { ...draft, [editingDetail]: detailValue.trim() };
        setSavingDetail(true);
        setDetailError('');
        try {
            await saveStudent(nextDraft, selectedStudent.id);
            setEditingDetail(null);
        } catch (reason) {
            setDetailError(writeError(reason));
        } finally {
            setSavingDetail(false);
        }
    };
    const selectedStudent = students.items.find(item => item.id === selectedStudentId) ?? null;
    const editableStudent = students.items.find(item => item.id === studentEditorId);
    const courseStudentIds = useMemo(() => new Set(
        enrollments.items.filter(item => item.courseId === courseFilter).map(item => item.studentId)
    ), [enrollments.items, courseFilter]);
    const shown = students.items
        .filter(student => `${student.fullName} ${student.dni ?? ''} ${student.email ?? ''}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')))
        .filter(student => statusFilter === 'all' ||
            (statusFilter === 'active' && student.active === true) ||
            (statusFilter === 'inactive' && student.active === false) ||
            (statusFilter === 'unknown' && student.active == null))
        .filter(student => courseFilter === 'all' || courseStudentIds.has(student.id))
        .sort((a, b) => {
            if (sortBy.startsWith('dni')) {
                // Keep missing DNIs at the end in both directions.
                if (!a.dni) return b.dni ? 1 : 0;
                if (!b.dni) return -1;
                const comparison = a.dni.localeCompare(b.dni, 'es', { numeric: true });
                return sortBy === 'dni-desc' ? -comparison : comparison;
            }
            const comparison = a.fullName.localeCompare(b.fullName, 'es', { sensitivity: 'base' });
            return sortBy === 'name-desc' ? -comparison : comparison;
        });
    const coursesById = useMemo(() => new Map(courses.items.map(course => [course.id, course])), [courses.items]);
    const selectedEnrollments = selectedStudent ? enrollments.items.filter(item => item.studentId === selectedStudent.id) : [];

    return <>
        <PageTitle
            kicker={t('ADMINISTRACIÓN ACADÉMICA')}
            title={t('Alumnos registrados')}
            description={t('Los datos personales se muestran únicamente a administradores autenticados.')}
            action={<button type="button" className={Styles.primaryButton} disabled={students.loading || Boolean(students.error)} onClick={() => setCreatingStudent(true)}><Plus size={16} />{t('Agregar alumno')}</button>}
        />
        <div className={Styles.hint}>
            {t('Cada alumno tiene una ficha editable por administradores, incluso si le faltan DNI, correo, fechas u otros datos. Para corregir inscripciones, utilizá la sección ')}<Link className={Styles.hintLink} to="/app/enrollments">{t('Inscripciones')}</Link>.
        </div>
        <Panel title={t('Directorio de alumnos')} subtitle={t('Registros académicos')}>
            <div className={Styles.studentFilters}>
                <label className={Styles.studentSearch}>
                    <span>{t('Buscar alumno')}</span>
                <input
                    className={Styles.filter}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={t('Buscar por nombre, DNI o correo…')}
                    aria-label={t('Buscar alumno')}
                />
                </label>
                <label className={Styles.filterControl}>
                    <span>{t('Ordenar por')}</span>
                    <select value={sortBy} onChange={event => setSortBy(event.target.value as typeof sortBy)}>
                        <option value="name-asc">{t('Nombre: A a Z')}</option>
                        <option value="name-desc">{t('Nombre: Z a A')}</option>
                        <option value="dni-asc">{t('DNI: menor a mayor')}</option>
                        <option value="dni-desc">{t('DNI: mayor a menor')}</option>
                    </select>
                </label>
                <label className={Styles.filterControl}>
                    <span>{t('Filtrar por estado')}</span>
                    <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)}>
                        <option value="all">{t('Todos los estados')}</option>
                        <option value="active">{t('Activo')}</option>
                        <option value="inactive">{t('Inactivo')}</option>
                        <option value="unknown">{t('Sin verificar')}</option>
                    </select>
                </label>
                <span className={Styles.studentCount}>{students.loading ? '…' : students.items.length} {t('registros')}</span>
            </div>
            <div className={Styles.courseFilterGroup} role="group" aria-label={t('Filtrar por carrera')}>
                <button type="button" aria-pressed={courseFilter === 'all'} className={courseFilter === 'all' ? Styles.courseFilterActive : Styles.courseFilterButton} onClick={() => setCourseFilter('all')}>{t('Todas las carreras')}</button>
                {courses.items.map(course => <button type="button" key={course.id} aria-pressed={courseFilter === course.id} className={courseFilter === course.id ? Styles.courseFilterActive : Styles.courseFilterButton} onClick={() => setCourseFilter(course.id)} disabled={Boolean(courses.error) || enrollments.loading || Boolean(enrollments.error)}>{course.name}</button>)}
            </div>
            {courseFilter !== 'all' && enrollments.error && <p className={Styles.error} role="alert">{t('No se pudieron cargar las inscripciones para filtrar por carrera.')}</p>}
            <LoadState loading={students.loading} error={students.error} />
            {!students.loading && !students.error && <div className="tableWrap">
                <table className={`dataTable ${Styles.studentsTable}`}><thead><tr>
                    <th>{t('Alumno')}</th><th>DNI</th><th>{t('Teléfono')}</th>
                    <th>{t('Inscripciones')}</th><th>{t('Estado')}</th><th>{t('Acciones')}</th>
                </tr></thead><tbody>{shown.map(student => {
                    const count = enrollments.items.filter(enrollment => enrollment.studentId === student.id).length;
                    return <tr key={student.id}>
                        <td><div className="tablePerson"><div><strong>{student.fullName}</strong><div className="muted">{student.email?.trim() || t('Email faltante')}</div></div></div></td>
                        <td>{student.dni?.trim() || t('DNI Faltante')}</td>
                        <td>{student.phone?.trim() || t('Teléfono faltante')}</td>
                        <td>{enrollments.loading ? '…' : enrollments.error ? '—' : count}</td>
                        <td><Pill tone={student.active === false ? 'warning' : student.active === true ? 'success' : 'neutral'}>
                            {t(student.active === null ? 'Sin verificar' : student.active ? 'Activo' : 'Inactivo')}
                        </Pill></td>
                        <td><div className={Styles.actions}>
                            <button type="button" className={Styles.viewStudentButton} onClick={() => setSelectedStudentId(student.id)}>{t('Ver ficha')}</button>
                            <button type="button" className={Styles.editStudentButton} onClick={() => setStudentEditorId(student.id)}>
                                <Pencil size={14} aria-hidden="true" /> {t('Editar ficha')}
                            </button>
                        </div></td>
                    </tr>;
                })}</tbody></table>
                {!shown.length && <EmptyState title={t('Sin alumnos')} message={t('No hay registros para mostrar.')} />}
            </div>}
        </Panel>
        {selectedStudent && <Modal title={selectedStudent.fullName} subtitle={undefined} width="wide" onClose={closeStudentDetails}>
            <dl className={Styles.details}>
                {([
                    { field: 'dni', label: 'DNI', value: selectedStudent.dni ?? '', display: selectedStudent.dni || '—' },
                    { field: 'birthDate', label: t('Fecha de nacimiento'), value: selectedStudent.birthDate ?? '', display: displayDate(selectedStudent.birthDate), type: 'date' },
                    { field: 'nationalityCode', label: t('Nacionalidad (código)'), value: selectedStudent.nationalityCode ?? '', display: selectedStudent.nationalityCode || '—' },
                    { field: 'birthPlace', label: t('Lugar de nacimiento'), value: selectedStudent.birthPlace ?? '', display: selectedStudent.birthPlace || t('A confirmar') },
                    { field: 'phone', label: t('Teléfono'), value: selectedStudent.phone ?? '', display: selectedStudent.phone || '—' },
                    { field: 'email', label: t('Correo electrónico'), value: selectedStudent.email ?? '', display: selectedStudent.email || '—', type: 'email' },
                    { field: 'address', label: t('Dirección'), value: selectedStudent.address ?? '', display: `${selectedStudent.address || '—'}${selectedStudent.city ? ` · ${selectedStudent.city}` : ''}`, full: true },
                ] as { field: keyof StudentDraft; label: string; value: string; display: string; type?: string; full?: boolean }[]).map(detail =>
                    <div key={detail.field} className={`${Styles.detailCard} ${detail.full ? Styles.full : ''}`}>
                        <dt>{detail.label}</dt>
                        {editingDetail === detail.field ?
                            <dd className={Styles.detailEditForm}>
                                <input
                                    aria-label={detail.label}
                                    type={detail.type || 'text'}
                                    value={detailValue}
                                    disabled={savingDetail}
                                    onChange={event => setDetailValue(event.target.value)}
                                    onKeyDown={event => {
                                        if (event.key === 'Enter') { event.preventDefault(); void saveDetail(); }
                                        if (event.key === 'Escape') setEditingDetail(null);
                                    }}
                                    autoFocus
                                />
                                <span className={Styles.detailEditActions}>
                                    <button type="button" className={Styles.detailSave} disabled={savingDetail} onClick={() => void saveDetail()}>{savingDetail ? 'Guardando…' : 'Guardar'}</button>
                                    <button type="button" className={Styles.detailCancel} disabled={savingDetail} onClick={() => setEditingDetail(null)}>Cancelar</button>
                                </span>
                            </dd> :
                            <dd className={Styles.detailRead}>
                                <span>{detail.display}</span>
                                <button
                                    type="button"
                                    className={Styles.detailEditButton}
                                    onClick={() => startDetailEdit(detail.field, detail.value)}
                                    aria-label={`Editar ${detail.label}`}
                                ><Pencil size={14} aria-hidden="true" />Editar {detail.label}</button>
                            </dd>}
                    </div>
                )}
                <div className={`${Styles.detailCard} ${Styles.full}`}>
                    <dt>{t('Cursos en los que está inscrito')}</dt>
                    <dd>{enrollments.loading ? '…' : enrollments.error ? '—' : [...new Set(selectedEnrollments.map(enrollment => coursesById.get(enrollment.courseId)?.name ?? t('Curso sin ficha')))].join(', ') || t('Sin inscripciones')}</dd>
                </div>
            </dl>
            {detailError && <p className={Styles.error} role="alert">{detailError}</p>}
            <div className={Styles.formActions}>
                <Link className={`${Styles.actionLink} ${Styles.enrollCourseButton}`} to={`/app/enrollments?student=${encodeURIComponent(selectedStudent.id)}`} onClick={closeStudentDetails}>
                    <Plus size={15} />{t('Inscribir en un curso')}
                </Link>
            </div>
        </Modal>}
        {creatingStudent && <StudentEditor onClose={() => setCreatingStudent(false)} />}
        {editableStudent && <StudentEditor
            student={editableStudent}
            onClose={() => setStudentEditorId(null)}
        />}
    </>;
}

/** Track enrollment history and preserve linked student and course documents. */
export function LiveEnrollments() {
    const { courses, students, enrollments } = useAcademy();
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [enrollmentSort, setEnrollmentSort] = useState<'name-asc' | 'name-desc' | 'dni-asc' | 'dni-desc'>('name-asc');
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
    const [editingEnrollmentId, setEditingEnrollmentId] = useState<string | null>(null);
    const [transferringEnrollmentId, setTransferringEnrollmentId] = useState<string | null>(null);
    const [creatingEnrollment, setCreatingEnrollment] = useState(false);
    const [editingEnrollmentField, setEditingEnrollmentField] = useState<keyof EnrollmentDraft | null>(null);
    const [enrollmentFieldValue, setEnrollmentFieldValue] = useState('');
    const [savingEnrollmentField, setSavingEnrollmentField] = useState(false);
    const [enrollmentFieldError, setEnrollmentFieldError] = useState('');

    const selectedEnrollment = enrollments.items.find(item => item.id === selectedEnrollmentId) ?? null;
    const editableEnrollment = enrollments.items.find(item => item.id === editingEnrollmentId);
    const closeEnrollmentDetails = () => {
        setSelectedEnrollmentId(null);
        setEditingEnrollmentField(null);
        setEnrollmentFieldError('');
    };
    const startEnrollmentFieldEdit = (field: keyof EnrollmentDraft, value: string) => {
        setEditingEnrollmentField(field);
        setEnrollmentFieldValue(value);
        setEnrollmentFieldError('');
    };
    const saveEnrollmentField = async () => {
        if (!selectedEnrollment || !editingEnrollmentField || savingEnrollmentField) return;
        if (editingEnrollmentField === 'status' && !['pending_review', 'completed', 'active', 'paused', 'withdrawn'].includes(enrollmentFieldValue)) {
            setEnrollmentFieldError('Seleccioná un estado válido antes de guardar.');
            return;
        }
        const toTriState = (value: boolean | null | undefined): 'unknown' | 'true' | 'false' =>
            value == null ? 'unknown' : value ? 'true' : 'false';
        const draft: EnrollmentDraft = {
            studentId: selectedEnrollment.studentId,
            courseId: selectedEnrollment.courseId,
            startDate: selectedEnrollment.startDate ?? '',
            status: (['pending_review', 'active', 'paused', 'completed', 'withdrawn'] as AcademicStatus[])
                .find(status => status === selectedEnrollment.status) ?? 'pending_review',
            courseworkCompleted: toTriState(selectedEnrollment.courseworkCompleted),
            courseCompleted: toTriState(selectedEnrollment.courseCompleted),
            completionNotes: selectedEnrollment.completionNotes ?? '',
        };
        const nextDraft = { ...draft, [editingEnrollmentField]: enrollmentFieldValue };
        setSavingEnrollmentField(true);
        setEnrollmentFieldError('');
        try {
            await updateEnrollment(selectedEnrollment.id, nextDraft);
            setEditingEnrollmentField(null);
        } catch (reason) {
            setEnrollmentFieldError(writeError(reason));
        } finally {
            setSavingEnrollmentField(false);
        }
    };

    const selectedCourseId = params.get('course') ?? '';
    const initialStudentId = params.get('student') ?? '';
    const studentsById = useMemo(() => new Map(students.items.map(student => [student.id, student])), [students.items]);
    const coursesById = useMemo(() => new Map(courses.items.map(course => [course.id, course])), [courses.items]);
    const filtered = enrollments.items.filter(item => {
        if (selectedCourseId && item.courseId !== selectedCourseId)
            return false;
        const student = studentsById.get(item.studentId);
        const course = coursesById.get(item.courseId);
        return `${student?.fullName ?? ''} ${course?.name ?? ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    }).sort((a, b) => {
        const studentA = studentsById.get(a.studentId);
        const studentB = studentsById.get(b.studentId);
        if (enrollmentSort.startsWith('name')) {
            const comparison = (studentA?.fullName ?? '').localeCompare(studentB?.fullName ?? '', 'es', { sensitivity: 'base' });
            return enrollmentSort === 'name-asc' ? comparison : -comparison;
        }
        const dniA = (studentA?.dni ?? '').replace(/\D/g, '');
        const dniB = (studentB?.dni ?? '').replace(/\D/g, '');
        // Keep missing DNI values at the end in either direction.
        if (!dniA && dniB) return 1;
        if (dniA && !dniB) return -1;
        const comparison = dniA.length - dniB.length || dniA.localeCompare(dniB);
        return enrollmentSort === 'dni-asc' ? comparison : -comparison;
    });
    const selectedStudent = selectedEnrollment ? studentsById.get(selectedEnrollment.studentId) : null;
    const selectedCourse = selectedEnrollment ? coursesById.get(selectedEnrollment.courseId) : null;
    const nextEnrollment = selectedEnrollment?.transferredToEnrollmentId
        ? enrollments.items.find(item => item.id === selectedEnrollment.transferredToEnrollmentId) : null;
    const previousEnrollment = selectedEnrollment?.transferFromEnrollmentId
        ? enrollments.items.find(item => item.id === selectedEnrollment.transferFromEnrollmentId) : null;

    return <>
        <PageTitle
            kicker={t('INSCRIPCIONES ACADÉMICAS')}
            title={t('Inscripciones de alumnos')}
            description={t('Cada vínculo conserva el curso, la fecha de inicio y las observaciones originales sin asumir estados faltantes.')}
            action={<button type="button" className={Styles.primaryButton} disabled={students.loading || courses.loading || enrollments.loading || Boolean(students.error || courses.error || enrollments.error)} onClick={() => setCreatingEnrollment(true)}><Plus size={16} />{t('Nueva inscripción')}</button>}
        />
        <div className={Styles.hint}>
            {t('Un alumno puede cursar varias formaciones. Los traslados conservan la inscripción original y crean una nueva.')}
        </div>
        <Panel title={t('Historial de inscripciones')}>
            <div className={Styles.filters}>
                <input
                    className={Styles.filter}
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder={t('Buscar alumno o curso…')}
                    aria-label={t('Buscar inscripción')}
                />
                <select
                    className={Styles.filter}
                    aria-label={t('Filtrar por curso')}
                    value={selectedCourseId}
                    onChange={event => {
                        const next = new URLSearchParams(params);
                        if (event.target.value)
                            next.set('course', event.target.value);
                        else
                            next.delete('course');
                        setParams(next);
                    }}
                >
                    <option value="">{t('Todos los cursos')}</option>
                    {courses.items.slice().sort((a, b) => a.name.localeCompare(b.name, 'es')).map(course =>
                        <option key={course.id} value={course.id}>{course.name}</option>
                    )}
                </select>
                <select
                    className={Styles.filter}
                    aria-label={t('Ordenar inscripciones')}
                    value={enrollmentSort}
                    onChange={event => setEnrollmentSort(event.target.value as typeof enrollmentSort)}
                >
                    <option value="name-asc">Nombre: A a Z</option>
                    <option value="name-desc">Nombre: Z a A</option>
                    <option value="dni-asc">DNI: menor a mayor</option>
                    <option value="dni-desc">DNI: mayor a menor</option>
                </select>
            </div>
            <LoadState loading={enrollments.loading || students.loading || courses.loading} error={enrollments.error || students.error || courses.error} />
            {!enrollments.loading && !students.loading && !courses.loading && !enrollments.error && !students.error && !courses.error && <div className={`tableWrap ${Styles.enrollmentsTable}`}>
                <table className="dataTable"><thead><tr>
                    <th>{t('Alumno')}</th><th>{t('Curso')}</th><th>{t('Fecha de inicio')}</th>
                    <th>{t('Estado')}</th><th>{t('Detalle')}</th>
                </tr></thead><tbody>{filtered.map(item => <tr key={item.id}>
                    <td><strong>{studentsById.get(item.studentId)?.fullName ?? t('Alumno sin ficha')}</strong></td>
                    <td>{coursesById.get(item.courseId)?.name ?? t('Curso sin ficha')}</td>
                    <td>{displayDate(item.startDate)}</td>
                    <td><Pill tone={item.status === 'active' ? 'success' : item.status === 'pending_review' ? 'warning' : 'neutral'}>{t(statusText(item.status))}</Pill></td>
                    <td><button type="button" className={Styles.tableLink} onClick={() => setSelectedEnrollmentId(item.id)}>{t('Detalle')}</button></td>
                </tr>)}</tbody></table>
                {!filtered.length && <EmptyState title={t('Sin inscripciones')} message={t('No hay inscripciones para ese filtro.')} />}
            </div>}
        </Panel>
        {selectedEnrollment && <Modal title={t('Detalle de inscripción')} subtitle={t('Inscripción académica')} width="wide" onClose={closeEnrollmentDetails}>
            <dl className={Styles.details}>
                <div className={`${Styles.detailCard} ${Styles.full}`}><dt>{t('Alumno')}</dt><dd>{selectedStudent?.fullName ?? t('Alumno sin ficha')}</dd></div>
                <div className={`${Styles.detailCard} ${Styles.full}`}><dt>{t('Curso')}</dt><dd>{selectedCourse?.name ?? t('Curso sin ficha')}</dd></div>
                {([
                    { field: 'startDate', label: t('Fecha de inicio'), value: selectedEnrollment.startDate ?? '', display: displayDate(selectedEnrollment.startDate), type: 'date' },
                    { field: 'status', label: t('Estado'), value: selectedEnrollment.status, display: t(statusText(selectedEnrollment.status)), options: [
                        { value: 'pending_review', label: 'A revisar' },
                        { value: 'completed', label: 'Finalizado' }, { value: 'active', label: 'Cursando' },
                        { value: 'paused', label: 'Inactivo' }, { value: 'withdrawn', label: 'Dado de baja' },
                    ] },
                    { field: 'completionNotes', label: t('Observaciones'), value: selectedEnrollment.completionNotes ?? '', display: selectedEnrollment.completionNotes || t('Sin informar'), full: true },
                ] as { field: keyof EnrollmentDraft; label: string; value: string; display: string; type?: string; full?: boolean; options?: {value: string; label: string}[] }[]).map(detail =>
                    <div key={detail.field} className={`${Styles.detailCard} ${detail.full ? Styles.full : ''}`}>
                        <dt>{detail.label}</dt>
                        {editingEnrollmentField === detail.field ?
                            <dd className={Styles.detailEditForm}>
                                {detail.options ?
                                    <select aria-label={detail.label} value={enrollmentFieldValue} disabled={savingEnrollmentField} onChange={event => setEnrollmentFieldValue(event.target.value)}>
                                        {detail.field === 'status' && !detail.options.some(option => option.value === enrollmentFieldValue) &&
                                            <option value={enrollmentFieldValue} disabled>Seleccioná un estado</option>}
                                        {detail.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                    </select> :
                                    <input aria-label={detail.label} type={detail.type || 'text'} value={enrollmentFieldValue} disabled={savingEnrollmentField}
                                        onChange={event => setEnrollmentFieldValue(event.target.value)}
                                        onKeyDown={event => {
                                            if (event.key === 'Enter') { event.preventDefault(); void saveEnrollmentField(); }
                                            if (event.key === 'Escape') setEditingEnrollmentField(null);
                                        }} autoFocus />}
                                <span className={Styles.detailEditActions}>
                                    <button type="button" className={Styles.detailSave} disabled={savingEnrollmentField} onClick={() => void saveEnrollmentField()}>{savingEnrollmentField ? 'Guardando…' : 'Guardar'}</button>
                                    <button type="button" className={Styles.detailCancel} disabled={savingEnrollmentField} onClick={() => setEditingEnrollmentField(null)}>Cancelar</button>
                                </span>
                            </dd> :
                            <dd className={Styles.detailRead}>
                                <span>{detail.display}</span>
                                {selectedEnrollment.status !== 'transferred' &&
                                    <button type="button" className={Styles.detailEditButton} onClick={() => startEnrollmentFieldEdit(detail.field, detail.value)}>
                                        <Pencil size={14} aria-hidden="true" />Editar {detail.label}
                                    </button>}
                            </dd>}
                    </div>
                )}
                <div className={`${Styles.detailCard} ${Styles.full}`}>
                    <dt>{t('Carreras')}</dt>
                    <dd>{[
                        ...new Set(enrollments.items
                            .filter(item => item.studentId === selectedEnrollment.studentId && item.status !== 'transferred')
                            .map(item => coursesById.get(item.courseId)?.name)
                            .filter((name): name is string => Boolean(name)))
                    ].join(' / ') || t('Sin inscripciones')}</dd>
                </div>
                {nextEnrollment && <div className={`${Styles.detailCard} ${Styles.full}`}><dt>{t('Trasladado a')}</dt><dd>{coursesById.get(nextEnrollment.courseId)?.name ?? '—'}</dd></div>}
                {previousEnrollment && <div className={`${Styles.detailCard} ${Styles.full}`}><dt>{t('Trasladado desde')}</dt><dd>{coursesById.get(previousEnrollment.courseId)?.name ?? '—'}</dd></div>}
                {selectedEnrollment.transferReason && <div className={`${Styles.detailCard} ${Styles.full}`}><dt>{t('Motivo del traslado')}</dt><dd>{selectedEnrollment.transferReason}</dd></div>}
            </dl>
            {enrollmentFieldError && <p className={Styles.error} role="alert">{enrollmentFieldError}</p>}
            {selectedEnrollment.status !== 'transferred' && !['completed', 'withdrawn'].includes(selectedEnrollment.status) &&
                <div className={Styles.formActions}>
                    <button type="button" className={Styles.secondaryButton} onClick={() => {
                        setTransferringEnrollmentId(selectedEnrollment.id);
                        closeEnrollmentDetails();
                    }}>{t('Cambiar de curso')}</button>
                </div>}
        </Modal>}
        {creatingEnrollment && <EnrollmentEditor
            students={students.items}
            courses={courses.items}
            initialStudentId={initialStudentId}
            initialCourseId={selectedCourseId}
            onClose={() => setCreatingEnrollment(false)}
        />}
        {editableEnrollment && <EnrollmentEditor
            enrollment={editableEnrollment}
            students={students.items}
            courses={courses.items}
            onClose={() => setEditingEnrollmentId(null)}
        />}
        {transferringEnrollmentId && (() => {
            const enrollment = enrollments.items.find(item => item.id === transferringEnrollmentId);
            return enrollment ? <TransferEditor enrollment={enrollment} courses={courses.items} onClose={() => setTransferringEnrollmentId(null)} /> : null;
        })()}
    </>;
}
