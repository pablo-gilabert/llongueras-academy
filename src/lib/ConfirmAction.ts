/** Accessible, localized SweetAlert2 confirmation for administrative writes. */
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import { t } from '../i18n/Translations';
import './ConfirmAction.css';

export type ChangeIntent = 'openCreate' | 'create' | 'update' | 'transfer' | 'attendance' | 'grades' | 'profile' | 'email' | 'password';

const titles: Record<ChangeIntent, string> = {
    openCreate: '¿Querés agregar un nuevo registro?',
    create: '¿Confirmás la creación del registro?',
    update: '¿Querés guardar estos cambios?',
    transfer: '¿Confirmás el traslado de inscripción?',
    attendance: '¿Querés guardar esta asistencia?',
    grades: '¿Confirmás las calificaciones?',
    profile: '¿Querés actualizar tus datos personales?',
    email: '¿Querés solicitar el cambio de correo?',
    password: '¿Confirmás el cambio de contraseña?',
};

const descriptions: Record<ChangeIntent, string> = {
    openCreate: 'Se abrirá el formulario. Los datos se guardarán solamente cuando confirmes el envío.',
    create: 'Se creará un nuevo registro en la base de datos.',
    update: 'Se actualizarán los datos del registro existente.',
    transfer: 'Se mantendrá el historial anterior y se creará la nueva inscripción.',
    attendance: 'Se registrará la asistencia del alumno en la fecha elegida.',
    grades: 'Se guardarán las notas y observaciones de esta evaluación.',
    profile: 'Tus datos se actualizarán en la cuenta institucional.',
    email: 'Se enviará un enlace de verificación al correo nuevo.',
    password: 'Tu contraseña actual será reemplazada por la nueva.',
};

/** Only a confirmed dialog authorizes the next write; cancelling changes nothing. */
export async function confirmChange(intent: ChangeIntent): Promise<boolean> {
    const result = await Swal.fire({
        title: t(titles[intent]),
        text: t(descriptions[intent]),
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: t('Sí, continuar'),
        cancelButtonText: t('Cancelar'),
        reverseButtons: true,
        focusCancel: true,
        buttonsStyling: false,
        allowOutsideClick: false,
        // The underlying editor has its own Escape handler: avoid dismissing both dialogs.
        allowEscapeKey: false,
        customClass: {
            popup: 'academy-confirm-popup',
            title: 'academy-confirm-title',
            htmlContainer: 'academy-confirm-description',
            actions: 'academy-confirm-actions',
            confirmButton: 'academy-confirm-approve',
            cancelButton: 'academy-confirm-cancel',
        },
        showClass: { popup: 'academy-confirm-enter' },
        hideClass: { popup: 'academy-confirm-exit' },
    });
    return result.isConfirmed;
}

/** Show success only after an awaited write completes, never on confirmation alone. */
export function showSavedSuccess(kind: 'saved' | 'verification' = 'saved'): void {
    void Swal.fire({
        position: 'center',
        icon: 'success',
        title: t(kind === 'verification' ? 'Solicitud enviada con éxito' : 'Cambios guardados con éxito'),
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
            popup: 'academy-success-popup',
            title: 'academy-success-title',
        },
        showClass: { popup: 'academy-confirm-enter' },
        hideClass: { popup: 'academy-confirm-exit' },
    });
}
