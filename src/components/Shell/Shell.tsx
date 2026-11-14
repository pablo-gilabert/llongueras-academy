/** Authenticated layout, responsive navigation and account actions. */
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
    BookOpen,
    CalendarCheck2,
    ChevronDown,
    LayoutDashboard,
    LogOut,
    Menu,
    UsersRound,
    X,
    NotebookTabs,
    ClipboardCheck,
    UserRound,
    Pencil,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../i18n/Preferences';
import { canSee, type Section } from '../../lib/Permissions';
import { roleLabel } from '../../lib/Utils';
import { t } from '../../i18n/Translations';
import { Avatar } from '../Common/Common';
import { DisplayControls } from '../DisplayControls/DisplayControls';
import Styles from './Shell.module.css';
import HomeStyles from './ShellHome.module.css';

const NAV: {
    section: Section;
    label: string;
    studentLabel?: string;
    Icon: typeof LayoutDashboard;
}[] = [
        { section: 'dashboard', label: 'Vista general', Icon: LayoutDashboard },
        { section: 'teaching', label: 'Mis cursos asignados', Icon: BookOpen },
        { section: 'students', label: 'Alumnos', Icon: UsersRound },
        { section: 'teachers', label: 'Docentes', Icon: UserRound },
        { section: 'courses', label: 'Cursos y materias', Icon: BookOpen },
        { section: 'enrollments', label: 'Inscripciones', studentLabel: 'Mis cursos', Icon: NotebookTabs },
        { section: 'attendance', label: 'Asistencias', studentLabel: 'Mi asistencia', Icon: CalendarCheck2 },
        { section: 'evaluations', label: 'Evaluaciones', studentLabel: 'Mis calificaciones', Icon: ClipboardCheck },
        { section: 'profile', label: 'Mi perfil', Icon: UserRound },
    ];

export const PAGE_NAMES: Record<Section, string> = {
    dashboard: 'Vista general', teaching: 'Mis cursos asignados', students: 'Alumnos', teachers: 'Docentes', courses: 'Cursos y materias', enrollments: 'Inscripciones', attendance: 'Asistencias', evaluations: 'Evaluaciones', profile: 'Mi perfil'
};

/** Render only sections granted by the verified account role. */
export function Shell() {
    const { user, logout } = useAuth();
    const { locale } = usePreferences();
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    if (!user)
        return null;

    const section = (location.pathname.split('/')[2] ?? 'dashboard') as Section;
    const activeTitle = NAV.find(n => n.section === section)?.[user.role === 'student' ? 'studentLabel' : 'label'] ?? PAGE_NAMES[section] ?? 'Plataforma';
    const homeLabel = locale === 'es' ? 'Volver al inicio' : locale === 'pt-BR' ? 'Voltar ao início' : 'Back to home';

    // All sign-out buttons end the session and return to the public academy landing page.
    const leave = async () => {
        setProfileOpen(false);
        setMenuOpen(false);
        try {
            await logout();
            navigate('/');
        }
        catch {
            window.alert(t('No se pudo cerrar la sesión. Intentá nuevamente.'));
        }
    };

    return <div className={Styles.layout}>
        {menuOpen && <button type="button" className={Styles.scrim} onClick={() => setMenuOpen(false)} aria-label={t('Cerrar menú')} />}
        <aside className={`${Styles.sidebar} ${menuOpen ? Styles.sidebarOpen : ''}`}>
            <div className={Styles.brandArea}>
                {/* Link to the public landing page; keeps the current session active. */}
                <Link
                    to="/"
                    className={HomeStyles.brandHome}
                    aria-label={homeLabel}
                    title={homeLabel}
                    onClick={() => setMenuOpen(false)}
                >
                    <img src="/media/llongueras-logo.png" alt="Academia Llongueras" className={HomeStyles.brandLogo} />
                    <span className={HomeStyles.brandCaption}>{homeLabel}</span>
                </Link>
                <button type="button" className={Styles.mobileClose} onClick={() => setMenuOpen(false)} aria-label={t('Cerrar menú')}>
                    <X size={19} />
                </button>
            </div>
            <div className={Styles.sidebarIntro}>
                <strong>{t('Campus institucional')}</strong>
            </div>
            <div className={Styles.navHeading}>{t('ESPACIO DE TRABAJO')}</div>
            <nav className={Styles.nav} aria-label={t('Navegación principal')}>
                {NAV.filter(n => canSee(user.role, n.section)).map(({ section: sec, label, studentLabel, Icon }) => <NavLink
                    to={`/app/${sec}`}
                    key={sec}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `${Styles.navItem} ${isActive ? Styles.navActive : ''}`}
                >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{t(user.role === 'student' && studentLabel ? studentLabel : label)}</span>
                </NavLink>)}
            </nav>
            <div className={Styles.sidebarBottom}>
                <button type="button" className={Styles.logout} onClick={() => { void leave(); }}>
                    <LogOut size={16} /> {t('Cerrar sesión')}
                </button>
            </div>
        </aside>
        <div className={Styles.mainArea}>
            <header className={Styles.topbar}>
                <div className={Styles.breadcrumb}>
                    <button type="button" className={Styles.menuToggle} onClick={() => setMenuOpen(true)} aria-label={t('Abrir menú')}>
                        <Menu size={20} />
                    </button>
                    {/* On narrow screens the sidebar is collapsed, so repeat the home link in the top bar. */}
                    <Link to="/" className={HomeStyles.mobileHome} aria-label={homeLabel} title={homeLabel}>
                        <img src="/media/llongueras-logo.png" alt="Academia Llongueras" className={HomeStyles.mobileLogo} />
                        <span>{homeLabel}</span>
                    </Link>
                    <span>{t('Panel académico')}</span>
                    <span className={Styles.slash}>{t('/')}</span>
                    <strong className={HomeStyles.pageTitle}>{t(activeTitle)}</strong>
                </div>
                <div className={Styles.topRight}>
                    <DisplayControls />
                    <button type="button" className={Styles.switchRole} onClick={() => { void leave(); }}>
                        <LogOut size={14} />
                        <span>{t('Cerrar sesión')}</span>
                    </button>
                    <span className={Styles.liveTag}>
                        <span /> {t(' Acceso verificado')}
                    </span>
                    <div className={Styles.profileWrap}>
                        <button type="button" className={Styles.profile} onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen}>
                            <Avatar name={user.name} size="small" />
                            <span className={Styles.profileDetails}>
                                <strong>{t(user.name)}</strong>
                                <small>{t(roleLabel[user.role])}</small>
                            </span>
                            <ChevronDown size={15} />
                        </button>
                        {profileOpen && <div className={Styles.dropdown}>
                            <div className={Styles.dropdownIntro}>
                                {t(user.email)}<br />
                                <strong>{t(roleLabel[user.role])}</strong>
                            </div>
                            <button type="button" onClick={() => { setProfileOpen(false); setMenuOpen(false); navigate('/app/profile'); }}>
                                <Pencil size={15} /> {t('Editar mi perfil')}
                            </button>
                            <button type="button" onClick={() => { void leave(); }}>
                                <LogOut size={15} /> {t('Cerrar sesión')}
                            </button>
                        </div>}
                    </div>
                </div>
            </header>
            <main className={Styles.content}>
                <Outlet />
                <footer className={Styles.footer}>
                    <span>© {new Date().getFullYear()} Academia Llongueras</span>
                    <span>
                        {locale === 'es' ? 'Desarrollado por Pablo Gilabert, fundador de ' : locale === 'pt-BR' ? 'Desenvolvido por Pablo Gilabert, fundador da ' : 'Developed by Pablo Gilabert, founder of '}
                        <a
                            className={Styles.developerLink}
                            href="https://pg-labs.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="PG Labs — Portfolio"
                        >PG Labs</a>
                    </span>
                </footer>
            </main>
        </div>
    </div>;
}
