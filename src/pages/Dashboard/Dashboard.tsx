/** Verified administrator overview, quick links and recent activity. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronRight, Sparkles, UsersRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useActivity } from '../../context/ActivityContext';
import { activityDescription } from '../../lib/AuditLog';
import { usePreferences } from '../../i18n/Preferences';
import { t } from '../../i18n/Translations';
import { Avatar, Button, PageTitle, Panel } from '../../components/Common/Common';
import { LiveOverview } from '../LiveAcademy/LiveAcademy';
import Styles from './Dashboard.module.css';

/** Aggregate real academic activity without exposing unverified records. */
export function Dashboard() {
    const { user } = useAuth();
    const activity = useActivity();
    const { locale } = usePreferences();
    const navigate = useNavigate();
    const [showMoreActivity, setShowMoreActivity] = useState(false);
    if (!user) return null;
    const greetingName = user.firstName?.trim() || user.name.trim().split(/\s+/)[0];
    const greeting = new Date().getHours() < 12 ? 'Buen día' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
    const entries = activity.items.filter(entry => entry.actorUid !== user.id);
    return <>
        <PageTitle
            kicker={t('SISTEMA DE GESTIÓN ACADÉMICA')}
            kickerClassName={Styles.dashboardKicker}
            title={t('Vista general')}
            description={`${t('Bienvenido a tu espacio de trabajo,')} ${greetingName}. ${t('Consultá los registros de la base de datos y todo lo que necesites.')}`}
        />
        <LiveOverview />
        <div className={Styles.hero}>
            <div className={Styles.heroCopy}>
                <div className={Styles.heroEyebrow}><Sparkles size={14} /> {t(' UNA NUEVA FORMA DE ORGANIZAR')}</div>
                <h2>{t(greeting)}{t(', ')}{greetingName}{t('. ')}<br />{t('Todo lo importante, en un lugar.')}</h2>
            </div>
            <div className={Styles.heroMark}>{t('A.')}</div>
        </div>
        <div className="sectionSpacer" />
        <div className="sectionGrid" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <Panel title={t('Actividad reciente')} subtitle={t('Cambios realizados en el campus')}
                action={entries.length > 5 ? <Button variant="ghost" onClick={() => setShowMoreActivity(v => !v)}>
                    {t(showMoreActivity ? 'Ver menos' : 'Ver más')}<ChevronRight size={15} />
                </Button> : undefined}>
                <div className={Styles.linkList}>
                    {activity.loading && <p className={Styles.activityStatus}>{t('Cargando actividad…')}</p>}
                    {activity.error && <p role="alert" className={Styles.activityError}>{t(activity.error)}</p>}
                    {!activity.loading && !activity.error && entries.slice(0, showMoreActivity ? 40 : 5).map(entry =>
                        <div className={Styles.item} key={entry.id}>
                            <Avatar name={entry.actorName} />
                            <div className={Styles.itemMain}>
                                <strong>{entry.actorName}</strong>
                                <small>{activityDescription(entry, locale === 'en', locale === 'pt-BR')}</small>
                            </div>
                            <span className={Styles.itemAside}>{entry.createdAt ? entry.createdAt.toLocaleString(locale === 'en' ? 'en-US' : locale === 'pt-BR' ? 'pt-BR' : 'es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '…'}</span>
                        </div>
                    )}
                    {!activity.loading && !activity.error && entries.length === 0 &&
                        <p className={Styles.activityStatus}>{t('Todavía no hay movimientos registrados por administradores ni docentes.')}</p>}
                </div>
            </Panel>
        </div>
        <div className="sectionSpacer" />
        <div className="sectionGrid">
            <Panel title={t('Accesos rápidos')} subtitle={t('Continuá con tus tareas de forma sencilla')}>
                <div className={Styles.simpleList}>
                    {[
                        { label: 'Gestionar alumnos e inscripciones', path: '/app/students', Icon: UsersRound },
                        { label: 'Gestionar cursos y materias', path: '/app/courses', Icon: BookOpen },
                    ].map(item => <button className={Styles.quickAction} type="button" key={item.path} onClick={() => navigate(item.path)}>
                        <span><item.Icon size={18} />{t(item.label)}</span><ArrowRight size={16} />
                    </button>)}
                </div>
            </Panel>
        </div>
    </>;
}
