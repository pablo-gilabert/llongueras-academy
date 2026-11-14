/** Firebase email/password sign-in and restricted-access messaging. */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenText, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { DisplayControls } from '../../components/DisplayControls/DisplayControls';
import { useAuth } from '../../context/AuthContext';
import { t } from '../../i18n/Translations';
import Styles from './Login.module.css';

export function Login() {
    const { login, authMessage, clearAuthMessage } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submitting)
            return;

        setSubmitting(true);
        setError('');

        const message = await login(email, password);
        if (message) {
            setError(message);
            setSubmitting(false);
            return;
        }

        navigate('/app', { replace: true });
    };

    const clearError = () => {
        setError('');
        clearAuthMessage();
    };

    return <div className={Styles.page}>
        <aside className={Styles.story}>
            <div className={Styles.storyContent}>
                <Link to="/" className={Styles.logo} aria-label="Volver a Academia Llongueras">
                    <img src="/media/llongueras-logo.png" alt="Academia Llongueras Argentina" className={Styles.brandLogo} />
                </Link>
                <div className={Styles.storyMain}>
                    <div className={Styles.eyebrow}>
                        <Sparkles size={13} /> {t('FORMACIÓN Y GESTIÓN, CONECTADAS')}
                    </div>
                    <h1>{t('Academia Llongueras.')}<br />
                        <em>{t('Tu campus digital.')}</em>
                    </h1>
                    <p>{t('Accedé al panel académico con tu cuenta institucional de Firebase Authentication.')}</p>
                    <div className={Styles.storyTiles}>
                        <div>
                            <span><Users size={19} /></span>
                            <strong>{t('Alumnos')}</strong>
                            <small>{t('Seguimiento centralizado')}</small>
                        </div>
                        <div>
                            <span><BookOpenText size={19} /></span>
                            <strong>{t('Docentes')}</strong>
                            <small>{t('Gestión simple de clases')}</small>
                        </div>
                        <div>
                            <span><ShieldCheck size={19} /></span>
                            <strong>{t('Dirección')}</strong>
                            <small>{t('Visión general y control')}</small>
                        </div>
                    </div>
                </div>
                <div className={Styles.storyFooter}>
                    <span className={Styles.storyDash} />{t('ACCESO INSTITUCIONAL RESTRINGIDO')}
                </div>
            </div>
            <div className={Styles.decorOne} />
            <div className={Styles.decorTwo} />
            <div className={Styles.decorThree} />
        </aside>

        <main className={Styles.loginArea}>
            <div className={Styles.loginTop}>
                <span className={Styles.tag}>{t('ACCESO INSTITUCIONAL')}</span>
                <span className={Styles.dot} />
                <DisplayControls />
            </div>
            <div className={Styles.formWrap}>
                <div className={Styles.welcomeIcon}>
                    <LockKeyhole size={20} />
                </div>
                <h2>{t('Tu espacio de trabajo,')}<br />{t('a un clic.')}</h2>
                <p className={Styles.intro}>{t('Ingresá con el correo y la contraseña de tu cuenta institucional autorizada.')}</p>
                <form className={Styles.form} onSubmit={handleSubmit}>
                    <label>{t('Correo electrónico')}
                        <input
                            autoComplete="username"
                            type="email"
                            required
                            value={email}
                            onChange={event => { setEmail(event.target.value); clearError(); }}
                            placeholder="nombre@correo.com"
                            disabled={submitting}
                        />
                    </label>
                    <label>{t('Contraseña')}
                        <div className={Styles.passwordWrap}>
                            <input
                                autoComplete="current-password"
                                type={isPasswordVisible ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={event => { setPassword(event.target.value); clearError(); }}
                                disabled={submitting}
                            />
                            <button
                                type="button"
                                aria-label={t(isPasswordVisible ? 'Ocultar contraseña' : 'Mostrar contraseña')}
                                onClick={() => setIsPasswordVisible(value => !value)}
                            >
                                {isPasswordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                            </button>
                        </div>
                    </label>
                    {(error || authMessage) && <p role="alert" className={Styles.error}>{t(error || authMessage)}</p>}
                    <button type="submit" className={Styles.loginButton} disabled={submitting}>
                        {t(submitting ? 'Verificando acceso…' : 'Ingresar al sistema')} <ArrowRight size={17} />
                    </button>
                </form>
                <p className={Styles.accessNote}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    {t('El acceso requiere una cuenta institucional habilitada.')}
                </p>
            </div>
            <div className={Styles.loginFooter}>
                {t('Ingresá con tu cuenta institucional. Los administradores gestionan la información académica; los docentes consultan únicamente los cursos que tienen asignados.')}
            </div>
        </main>
    </div>;
}
