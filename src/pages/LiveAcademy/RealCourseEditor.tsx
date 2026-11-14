/** Administrative course modal with optional verified fields. */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Modal, SelectInput, TextArea, TextInput } from '../../components/Common/Common';
import type { AcademyCourse } from '../../context/AcademyContext';
import { courseDraft, saveRealCourse } from '../../lib/CourseMutations';
import type { CourseDraft } from '../../lib/CourseMutations';
import { writeError } from '../../lib/AcademyMutations';
import { t } from '../../i18n/Translations';
import { confirmChange, showSavedSuccess } from '../../lib/ConfirmAction';
import Styles from './LiveAcademy.module.css';

export function RealCourseEditor({ course, occupied, enrollmentCount, onClose }: {
    course: AcademyCourse;
    occupied: number;
    enrollmentCount: number;
    onClose: () => void;
}) {
    const [form, setForm] = useState<CourseDraft>(() => courseDraft(course));
    const [saving, setSaving] = useState(false);
    const [confirmDeactivate, setConfirmDeactivate] = useState(false);
    const [error, setError] = useState('');

    const update = <K extends keyof CourseDraft>(field: K, value: CourseDraft[K]) => {
        setForm(current => ({ ...current, [field]: value }));
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (course.active && !form.active && !confirmDeactivate) {
            setError('Confirmá que querés desactivar el curso sin eliminar sus inscripciones.');
            return;
        }
        if (!await confirmChange('update')) return;
        setError('');
        setSaving(true);
        try {
            await saveRealCourse(course, form);
            onClose();
            showSavedSuccess();
        } catch (reason) {
            setError(writeError(reason));
        } finally {
            setSaving(false);
        }
    };

    return <Modal
        title="Editar información del curso"
        subtitle="Los cambios se guardan en el documento original de Cloud Firestore."
        width="wide"
        onClose={() => { if (!saving) onClose(); }}
    >
        <form onSubmit={submit} className={Styles.editorForm}>
            <p className={Styles.formNote}>
                {t('Podés cambiar el nombre y completar una descripción opcional. Los datos que la academia aún no confirmó pueden quedar vacíos. No se crearán cursos ni inscripciones nuevas.')}
            </p>
            <div className={Styles.formGrid}>
                <div className={Styles.formFull}>
                    <TextInput label="Nombre del curso" value={form.name} required onChange={value => update('name', value)} />
                </div>
                <SelectInput
                    label="Modalidad"
                    value={form.modality}
                    onChange={value => update('modality', value)}
                    options={[
                        { value: '', label: 'Sin informar' },
                        { value: 'Presencial', label: 'Presencial' },
                        { value: 'Híbrida', label: 'Híbrida' },
                        { value: 'Virtual', label: 'Virtual' },
                        ...(form.modality && !['Presencial', 'Híbrida', 'Virtual'].includes(form.modality)
                            ? [{ value: form.modality, label: form.modality }]
                            : []),
                    ]}
                />
                <TextInput label="Duración" value={form.duration} placeholder="Ej.: 8 meses" onChange={value => update('duration', value)} />
                <TextInput label="Fecha de inicio (opcional)" type="date" value={form.startDate} onChange={value => update('startDate', value)} />
                <TextInput label="Fecha de finalización (opcional)" type="date" value={form.endDate} onChange={value => update('endDate', value)} />
                <TextInput
                    label="Cupos máximos (opcional)"
                    type="number"
                    min={1}
                    max={100000}
                    value={form.capacity}
                    onChange={value => update('capacity', value)}
                />
                <SelectInput
                    label="Estado del curso"
                    value={String(form.active)}
                    onChange={value => {
                        update('active', value === 'true');
                        setConfirmDeactivate(false);
                    }}
                    options={[
                        { value: 'true', label: 'Disponible' },
                        { value: 'false', label: 'Inactivo' },
                    ]}
                />
                <div className={Styles.formFull}>
                    <TextArea label={t("Descripción del curso (opcional)")} value={form.description} onChange={value => update('description', value)} />
                </div>
            </div>
            <p className={Styles.formNote}>
                {t('Inscripciones del curso')}: {enrollmentCount} · {t('Vigentes o pendientes')}: {occupied}.
                {' '}{t('El cupo no puede ser inferior a estas últimas.')}
            </p>
            <p className={Styles.formNote}>
                {t('Cambiar el nombre no modifica el ID del curso, pero puede afectar importadores externos que lo busquen por nombre.')}
            </p>
            {!form.active && course.active && <label className={Styles.confirmLine}>
                <input type="checkbox" checked={confirmDeactivate} disabled={saving} onChange={event => setConfirmDeactivate(event.target.checked)} />
                <span>{t('Confirmo que quiero desactivar este curso sin borrar su historial académico.')}</span>
            </label>}
            {error && <p className={Styles.error} role="alert">{t(error)}</p>}
            <div className={Styles.formActions}>
                <Button variant="secondary" disabled={saving} onClick={onClose}>{t('Cancelar')}</Button>
                <Button type="submit" className="academyWriteAction" disabled={saving}>{t(saving ? 'Guardando…' : 'Guardar curso')}</Button>
            </div>
        </form>
    </Modal>;
}
