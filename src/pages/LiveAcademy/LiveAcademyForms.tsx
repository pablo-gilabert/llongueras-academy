/** Typed student, enrollment and transfer editing forms. */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, Modal, SelectInput, TextArea, TextInput } from '../../components/Common/Common';
import type { AcademyCourse, AcademyEnrollment, AcademyStudent } from '../../context/AcademyContext';
import {
    createEnrollment,
    saveStudent,
    studentDraft,
    transferEnrollment,
    updateEnrollment,
    writeError,
} from '../../lib/AcademyMutations';
import type { AcademicStatus, EnrollmentDraft, StudentDraft, TransferDraft } from '../../lib/AcademyMutations';
import { getActiveLocale, localizeCourseName, t } from '../../i18n/Translations';
import { confirmChange, showSavedSuccess } from '../../lib/ConfirmAction';
import Styles from './LiveAcademy.module.css';

function localToday() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const yesNoUnknown = [
    { value: 'unknown', label: 'Sin informar' },
    { value: 'true', label: 'Sí' },
    { value: 'false', label: 'No' },
];
const statusOptions = [
    { value: 'pending_review', label: 'A revisar' },
    { value: 'active', label: 'Activo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Finalizado' },
    { value: 'withdrawn', label: 'Baja' },
];

// Imported full names are never split heuristically; administrators verify each name component.
export function StudentEditor({ student, onClose }: {
    student?: AcademyStudent;
    onClose: () => void;
}) {
    const [form, setForm] = useState<StudentDraft>(() => studentDraft(student));
    const [saving, setSaving] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [error, setError] = useState('');
    const update = <K extends keyof StudentDraft>(field: K, value: StudentDraft[K]) => {
        setForm(current => ({ ...current, [field]: value }));
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (student?.active !== false && form.active === 'false' && !confirmDeactivate) {
            setError('Confirmá la desactivación de la ficha.');
            return;
        }
        if (!await confirmChange(student ? 'update' : 'create')) return;
        setSaving(true);
        setError('');
        try {
            await saveStudent(form, student?.id);
            onClose();
            showSavedSuccess();
        } catch (reason) {
            setError(writeError(reason));
        } finally {
            setSaving(false);
        }
    };

    return <Modal
        title={student ? 'Editar ficha de alumno' : 'Agregar ficha de alumno'}
        subtitle="Los cambios se guardan automáticamente en la base de datos de la academia"
        width="wide"
        onClose={onClose}
    >
        <form onSubmit={submit} className={Styles.editorForm}>
            <p className={Styles.formNote}>{t('Completá los datos del alumno. Correo electrónico, nacionalidad y dirección son opcionales.')}</p>
            {student && (!student.firstName || !student.lastName) && <p className={Styles.formNote}>
                {t('Nombre completo registrado:')} <strong>{student.fullName}</strong>.{' '}
                {t('Completá Nombre y Apellido para verificarlo sin perder el nombre importado.')}
            </p>}
            <p className={Styles.formNote}>
                {t('Para editar el curso, la fecha de inscripción o el estado académico, utilizá la sección ')}
                <Link className={Styles.hintLink} to="/app/enrollments">{t('Inscripciones')}</Link>
                {t('. La ficha personal no se duplica al inscribir a un alumno en varios cursos.')}
            </p>
            <div className={Styles.formGrid}>
                <TextInput label="Nombre" value={form.firstName} onChange={value => update('firstName', value)} required={!student || Boolean(student.firstName) || Boolean(form.firstName || form.lastName)} />
                <TextInput label="Apellido" value={form.lastName} onChange={value => update('lastName', value)} required={!student || Boolean(student.lastName) || Boolean(form.firstName || form.lastName)} />
                <TextInput label="DNI" value={form.dni} onChange={value => update('dni', value)} required={!student || Boolean(student.dni)} />
                <TextInput label="Fecha de nacimiento" type="date" value={form.birthDate} onChange={value => update('birthDate', value)} required={!student || Boolean(student.birthDate)} />
                <TextInput label="Nacionalidad (opcional)" value={form.nationalityCode} onChange={value => update('nationalityCode', value)} />
                <TextInput label="Teléfono" type="tel" value={form.phone} onChange={value => update('phone', value)} required={!student || Boolean(student.phone)} />
                <TextInput label="Correo electrónico (opcional)" type="email" value={form.email} onChange={value => update('email', value)} />
                <TextInput label="Localidad" value={form.city} onChange={value => update('city', value)} required={!student || Boolean(student.city)} />
                <div className={Styles.formFull}>
                    <TextInput label="Dirección (opcional)" value={form.address} onChange={value => update('address', value)} />
                </div>
                <SelectInput
                    label="Estado del alumno"
                    value={form.active}
                    onChange={value => update('active', value as StudentDraft['active'])}
                    options={[
                        { value: 'unknown', label: 'Sin verificar' },
                        { value: 'true', label: 'Activo' },
                        { value: 'false', label: 'Inactivo' },
                    ]}
                />
            </div>
            {form.active === 'false' && student?.active !== false && <label className={Styles.confirmLine}>
                <input type="checkbox" checked={confirmDeactivate} onChange={event => setConfirmDeactivate(event.target.checked)} />
                <span>{t('Confirmo que quiero desactivar esta ficha sin borrar su historial.')}</span>
            </label>}
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            <div className={Styles.formActions}>
                <Button variant="secondary" onClick={onClose} disabled={saving}>{t('Cancelar')}</Button>
                <Button type="submit" className="academyWriteAction" disabled={saving}>{t(saving ? 'Guardando…' : 'Guardar ficha')}</Button>
            </div>
        </form>
    </Modal>;
}

function enrollmentDraft(item?: AcademyEnrollment, studentId = '', courseId = ''): EnrollmentDraft {
    const boolLabel = (value: boolean | null | undefined) => value == null ? 'unknown' : String(value) as 'true' | 'false';
    return {
        studentId: item?.studentId ?? studentId,
        courseId: item?.courseId ?? courseId,
        startDate: item?.startDate ?? localToday(),
        status: (item?.status === 'transferred' ? 'withdrawn' : item?.status ?? 'active') as AcademicStatus,
        courseworkCompleted: boolLabel(item?.courseworkCompleted),
        courseCompleted: boolLabel(item?.courseCompleted),
        completionNotes: item?.completionNotes ?? '',
    };
}

export function EnrollmentEditor({ enrollment, students, courses, initialStudentId = '', initialCourseId = '', onClose }: {
    enrollment?: AcademyEnrollment;
    students: AcademyStudent[];
    courses: AcademyCourse[];
    initialStudentId?: string;
    initialCourseId?: string;
    onClose: () => void;
}) {
    const [form, setForm] = useState<EnrollmentDraft>(() => enrollmentDraft(
        enrollment,
        initialStudentId || students.find(student => student.active !== false)?.id || '',
        initialCourseId || courses.find(course => course.active)?.id || '',
    ));
    const [saving, setSaving] = useState(false);
    const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
    const [error, setError] = useState('');
    const update = <K extends keyof EnrollmentDraft>(field: K, value: EnrollmentDraft[K]) => {
        setForm(current => ({ ...current, [field]: value }));
    };
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (form.status === 'withdrawn' && enrollment?.status !== 'withdrawn' && !confirmWithdrawal) {
            setError('Confirmá la baja de la inscripción.');
            return;
        }
        if (!await confirmChange(enrollment ? 'update' : 'create')) return;
        setError('');
        setSaving(true);
        try {
            if (enrollment) await updateEnrollment(enrollment.id, form);
            else await createEnrollment(form);
            onClose();
            showSavedSuccess();
        } catch (reason) {
            setError(writeError(reason));
        } finally {
            setSaving(false);
        }
    };
    return <Modal
        title={enrollment ? 'Editar inscripción académica' : 'Nueva inscripción académica'}
        subtitle="Se utilizarán los identificadores existentes de alumnos y cursos en Firestore."
        width="wide"
        onClose={onClose}
    >
        <form className={Styles.editorForm} onSubmit={submit}>
            <div className={Styles.formGrid}>
                <SelectInput
                    label="Alumno"
                    value={form.studentId}
                    disabled={Boolean(enrollment)}
                    required
                    onChange={value => update('studentId', value)}
                    options={[
                        { value: '', label: 'Seleccionar alumno' },
                        ...students
                            .filter(student => enrollment?.studentId === student.id || student.active !== false)
                            .slice().sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'))
                            .map(student => ({ value: student.id, label: `${student.fullName} · ${student.dni}` })),
                    ]}
                />
                <SelectInput
                    label="Curso"
                    value={form.courseId}
                    disabled={Boolean(enrollment)}
                    required
                    onChange={value => update('courseId', value)}
                    options={[
                        { value: '', label: 'Seleccionar curso' },
                        ...courses.filter(course => course.active || enrollment?.courseId === course.id)
                            .slice().sort((a, b) => localizeCourseName(a.name).localeCompare(localizeCourseName(b.name), getActiveLocale()))
                            .map(course => ({ value: course.id, label: localizeCourseName(course.name) })),
                    ]}
                />
                <TextInput label="Fecha de inicio" type="date" value={form.startDate} required onChange={value => update('startDate', value)} />
                <SelectInput
                    label="Estado de la inscripción"
                    value={form.status}
                    onChange={value => update('status', value as AcademicStatus)}
                    options={statusOptions}
                />
                <SelectInput
                    label="Terminó (planilla)"
                    value={form.courseworkCompleted}
                    onChange={value => update('courseworkCompleted', value as EnrollmentDraft['courseworkCompleted'])}
                    options={yesNoUnknown}
                />
                <SelectInput
                    label="Curso finalizado (verificado)"
                    value={form.courseCompleted}
                    onChange={value => update('courseCompleted', value as EnrollmentDraft['courseCompleted'])}
                    options={yesNoUnknown}
                />
                <div className={Styles.formFull}>
                    <TextArea label="Observaciones" value={form.completionNotes} onChange={value => update('completionNotes', value)} />
                </div>
            </div>
            <p className={Styles.formNote}>{t('El estado de la inscripción y la finalización verificada se registran por separado. Una baja nunca borra el historial.')}</p>
            {form.status === 'withdrawn' && enrollment?.status !== 'withdrawn' && <label className={Styles.confirmLine}>
                <input type="checkbox" checked={confirmWithdrawal} onChange={event => setConfirmWithdrawal(event.target.checked)} />
                <span>{t('Confirmo la baja de esta inscripción sin eliminar sus datos.')}</span>
            </label>}
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            <div className={Styles.formActions}>
                <Button variant="secondary" onClick={onClose} disabled={saving}>{t('Cancelar')}</Button>
                <Button type="submit" className="academyWriteAction" disabled={saving}>{t(saving ? 'Guardando…' : 'Guardar inscripción')}</Button>
            </div>
        </form>
    </Modal>;
}

export function TransferEditor({ enrollment, courses, onClose }: {
    enrollment: AcademyEnrollment;
    courses: AcademyCourse[];
    onClose: () => void;
}) {
    const [form, setForm] = useState<TransferDraft>({
        toCourseId: '',
        startDate: localToday(),
        reason: '',
    });
    const [confirmed, setConfirmed] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!confirmed) {
            setError('Confirmá que querés conservar la inscripción anterior como trasladada.');
            return;
        }
        if (!await confirmChange('transfer')) return;
        setSaving(true);
        setError('');
        try {
            await transferEnrollment(enrollment.id, form);
            onClose();
            showSavedSuccess();
        } catch (reason) {
            setError(writeError(reason));
        } finally {
            setSaving(false);
        }
    };
    return <Modal title="Cambiar de curso" subtitle="El historial original se conserva; se creará otra inscripción." onClose={onClose}>
        <form onSubmit={submit} className={Styles.editorForm}>
            <SelectInput
                label="Nuevo curso"
                value={form.toCourseId}
                onChange={value => setForm(current => ({ ...current, toCourseId: value }))}
                required
                options={[
                    { value: '', label: 'Seleccionar curso' },
                    ...courses.filter(course => course.active && course.id !== enrollment.courseId)
                        .slice().sort((a, b) => localizeCourseName(a.name).localeCompare(localizeCourseName(b.name), getActiveLocale()))
                        .map(course => ({ value: course.id, label: localizeCourseName(course.name) })),
                ]}
            />
            <TextInput
                label="Fecha de inicio en el nuevo curso"
                type="date"
                required
                value={form.startDate}
                onChange={value => setForm(current => ({ ...current, startDate: value }))}
            />
            <TextArea label="Motivo del traslado" value={form.reason} onChange={value => setForm(current => ({ ...current, reason: value }))} />
            <label className={Styles.confirmLine}>
                <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                <span>{t('Confirmo el traslado y el cambio de estado de la inscripción anterior.')}</span>
            </label>
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            <div className={Styles.formActions}>
                <Button variant="secondary" onClick={onClose} disabled={saving}>{t('Cancelar')}</Button>
                <Button type="submit" className="academyWriteAction" disabled={saving || !confirmed}>{t(saving ? 'Guardando…' : 'Confirmar traslado')}</Button>
            </div>
        </form>
    </Modal>;
}
