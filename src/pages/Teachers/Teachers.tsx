/** Firestore-backed teacher directory and course assignment editor. */
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, UsersRound } from 'lucide-react';
import { Button, EmptyState, Modal, PageTitle, Panel, Pill, TextInput } from '../../components/Common/Common';
import { useAcademy } from '../../context/AcademyContext';
import type { AcademyCourse, AcademyTeacher } from '../../context/AcademyContext';
import { saveTeacher, teacherDraft } from '../../lib/TeacherMutations';
import type { TeacherDraft } from '../../lib/TeacherMutations';
import { writeError } from '../../lib/AcademyMutations';
import { t } from '../../i18n/Translations';
import { confirmChange } from '../../lib/ConfirmAction';
import Styles from './Teachers.module.css';

/** Edit the Firestore profile while keeping account provisioning separate. */
function TeacherEditor({ teacher, courses, onClose }: {
    teacher?: AcademyTeacher;
    courses: AcademyCourse[];
    onClose: () => void;
}) {
    const [form, setForm] = useState<TeacherDraft>(() => teacherDraft(teacher));
    const [saving, setSaving] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [error, setError] = useState('');
    const orderedCourses = useMemo(() => [...courses].sort((a, b) => a.name.localeCompare(b.name, 'es')), [courses]);
    const update = <K extends keyof TeacherDraft>(field: K, value: TeacherDraft[K]) => {
        setForm(previous => ({ ...previous, [field]: value }));
    };
    const toggleCourse = (id: string, selected: boolean) => {
        update('courseIds', selected
            ? [...new Set([...form.courseIds, id])]
            : form.courseIds.filter(courseId => courseId !== id));
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (teacher?.active !== false && !form.active && !confirmDeactivate) {
            setError('Confirmá la desactivación del docente.');
            return;
        }
        if (!await confirmChange(teacher ? 'update' : 'create')) return;
        setSaving(true);
        setError('');
        try {
            await saveTeacher(form, teacher?.id);
            onClose();
        } catch (reason) {
            setError(writeError(reason));
        } finally {
            setSaving(false);
        }
    };

    return <Modal
        title={t(teacher ? 'Editar ficha de docente' : 'Crear ficha de docente')}
        subtitle={t('Ficha administrativa del docente. La cuenta de acceso se configura por separado.')}
        width="wide"
        onClose={() => { if (!saving) onClose(); }}
    >
        <form onSubmit={submit} className={Styles.form}>
            <div className={Styles.formGrid}>
                <TextInput
                    label="Nombre completo"
                    value={form.fullName}
                    required
                    onChange={value => update('fullName', value)}
                />
                <TextInput
                    label="Especialidad"
                    value={form.specialty}
                    onChange={value => update('specialty', value)}
                />
                <TextInput
                    label="Correo electrónico"
                    type="email"
                    value={form.email}
                    onChange={value => update('email', value)}
                />
                <TextInput
                    label="Teléfono"
                    value={form.phone}
                    onChange={value => update('phone', value)}
                />
            </div>

            <fieldset className={Styles.courseFieldset}>
                <legend>{t('Seleccioná uno o varios cursos (opcional)')}</legend>
                {orderedCourses.length ? <div className={Styles.courseChoices}>
                    {orderedCourses.map(course => {
                        const assigned = form.courseIds.includes(course.id);
                        const allowSelection = course.active || assigned;
                        return <label key={course.id} className={Styles.courseChoice}>
                            <input
                                type="checkbox"
                                checked={assigned}
                                disabled={!allowSelection || saving}
                                onChange={event => toggleCourse(course.id, event.target.checked)}
                            />
                            <span>{course.name}{!course.active ? ` · ${t('Curso inactivo')}` : ''}</span>
                        </label>;
                    })}
                </div> : <p className={Styles.note}>{t('No hay cursos disponibles para asignar.')}</p>}
            </fieldset>

            <p className={Styles.note}>
                {t('Podés vincular el docente a varios cursos. No se modifican los alumnos ni sus inscripciones.')}
            </p>
            <label className={Styles.checkLine}>
                <input
                    type="checkbox"
                    checked={form.active}
                    disabled={saving}
                    onChange={event => {
                        update('active', event.target.checked);
                        setConfirmDeactivate(false);
                    }}
                />
                <span>{t('Activo')}</span>
            </label>
            {!form.active && teacher?.active !== false && <label className={Styles.checkLine}>
                <input
                    type="checkbox"
                    checked={confirmDeactivate}
                    disabled={saving}
                    onChange={event => setConfirmDeactivate(event.target.checked)}
                />
                <span>{t('Confirmo que quiero desactivar este docente sin borrar su ficha ni sus cursos asignados.')}</span>
            </label>}
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            <div className={Styles.formActions}>
                <Button variant="secondary" onClick={onClose} disabled={saving}>{t('Cancelar')}</Button>
                <Button type="submit" className="academyWriteAction" disabled={saving}>{t(saving ? 'Guardando…' : 'Guardar docente')}</Button>
            </div>
        </form>
    </Modal>;
}

/** Search the private teacher collection and manage existing assignments. */
export function Teachers() {
    const { teachers, courses } = useAcademy();
    const [search, setSearch] = useState('');
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const editing = teachers.items.find(teacher => teacher.id === editingId);
    const shown = teachers.items.filter(teacher =>
        `${teacher.fullName} ${teacher.email ?? ''} ${teacher.specialty ?? ''}`
            .toLocaleLowerCase().includes(search.toLocaleLowerCase()))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    const coursesById = useMemo(() => new Map(courses.items.map(course => [course.id, course])), [courses.items]);
    const available = !teachers.loading && !courses.loading && !teachers.error && !courses.error;

    return <>
        <PageTitle
            kicker={t('ADMINISTRACIÓN DE DOCENTES')}
            title={t('Directorio de docentes')}
            description={t('Registrá docentes y asignales los cursos existentes. Las cuentas de acceso se habilitan por separado.')}
            action={<Button disabled={!available} onClick={() => { void confirmChange('openCreate').then(ok => { if (ok) setCreating(true); }); }}>
                <Plus size={16} /> {t('Agregar docente')}
            </Button>}
        />
        <div className={Styles.notice}>
            {t('Esta sección está protegida. Solo los administradores pueden consultar las fichas docentes.')}
        </div>
        <Panel title={t('Docentes registrados')} subtitle={t('Registros académicos')}>
            <div className={Styles.toolbar}>
                <label className={Styles.search}>
                    <Search size={17} aria-hidden="true" />
                    <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder={t('Buscar docente por nombre, especialidad o correo…')}
                        aria-label={t('Buscar docente')}
                    />
                </label>
                <span className={Styles.count}>{teachers.loading ? '…' : teachers.error ? '—' : teachers.items.length} {t('registros')}</span>
            </div>
            {(teachers.loading || courses.loading) && <p className={Styles.note} role="status">{t('Cargando registros de Firestore…')}</p>}
            {teachers.error && <p className={Styles.error} role="alert">{t(teachers.error)}</p>}
            {courses.error && <p className={Styles.error} role="alert">{t(courses.error)}</p>}
            {available && (!teachers.items.length ? <EmptyState
                title={t('No hay docentes registrados')}
                message={t('Todavía no se cargaron docentes. Podés agregar el primero sin asignarle cursos.')}
            /> : <div className="tableWrap">
                <table className="dataTable">
                    <thead><tr>
                        <th>{t('Docente')}</th>
                        <th>{t('Especialidad')}</th>
                        <th>{t('Cursos asignados')}</th>
                        <th>{t('Estado')}</th>
                        <th>{t('Acceso')}</th>
                        <th>{t('Editar')}</th>
                    </tr></thead>
                    <tbody>{shown.map(teacher => <tr key={teacher.id}>
                        <td><div className="tablePerson">
                            <div>
                                <strong>{teacher.fullName}</strong>
                                <div className="muted">{teacher.email || teacher.phone || '—'}</div>
                            </div>
                        </div></td>
                        <td>{teacher.specialty || '—'}</td>
                        <td>
                            <div className={Styles.courseTags}>
                                {teacher.courseIds.length ? teacher.courseIds.map(courseId =>
                                    <span key={courseId} className={Styles.courseTag}>
                                        {coursesById.get(courseId)?.name ?? t('Curso sin ficha')}
                                    </span>
                                ) : <span className="muted">{t('Sin docentes asignados')}</span>}
                            </div>
                        </td>
                        <td><Pill tone={teacher.active ? 'success' : 'warning'}>
                            {t(teacher.active ? 'Activo' : 'Inactivo')}
                        </Pill></td>
                        <td><Pill tone={teacher.authUid ? 'success' : 'warning'}>
                            {t(teacher.authUid ? 'Cuenta vinculada' : 'Sin cuenta vinculada')}
                        </Pill></td>
                        <td><button type="button" className={`${Styles.editButton} academyWriteAction`} onClick={() => setEditingId(teacher.id)}>
                            <Pencil size={14} /> {t('Editar ficha')}
                        </button></td>
                    </tr>)}</tbody>
                </table>
                {!shown.length && <EmptyState title={t('Sin resultados')} message={t('No hay registros para mostrar.')} />}
            </div>)}
        </Panel>
        {available && <div className={Styles.footerLinks}>
            <UsersRound size={16} aria-hidden="true" />
            <Link to="/app/courses">{t('Ver cursos')}</Link>
        </div>}
        {creating && <TeacherEditor courses={courses.items} onClose={() => setCreating(false)} />}
        {editing && <TeacherEditor key={editing.id} teacher={editing} courses={courses.items} onClose={() => setEditingId(null)} />}
    </>;
}
