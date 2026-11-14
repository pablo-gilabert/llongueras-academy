/** Role-based routing and guarded access to the institutional workspace. */
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Shell } from './components/Shell/Shell';
import { useAuth } from './context/AuthContext';
import { AcademyProvider } from './context/AcademyContext';
import { ActivityProvider } from './context/ActivityContext';
import { usePreferences } from './i18n/Preferences';
import { t } from './i18n/Translations';
import { canSee, type Section } from './lib/Permissions';
import { Login } from './pages/Login/Login';
import { Landing } from './pages/Landing/Landing';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Students } from './pages/Students/Students';
import { Teachers } from './pages/Teachers/Teachers';
import { Teaching } from './pages/Teaching/Teaching';
import { Courses } from './pages/Courses/Courses';
import { Enrollments } from './pages/Enrollments/Enrollments';
import { Attendance } from './pages/Attendance/Attendance';
import { Evaluations } from './pages/Evaluations/Evaluations';
import { Profile } from './pages/Profile/Profile';
// The route registry contains every academic feature page.
const SECTIONS: Record<Section, ReactNode> = {
    dashboard: <Dashboard />,
    teaching: <Teaching />,
    students: <Students />,
    teachers: <Teachers />,
    courses: <Courses />,
    enrollments: <Enrollments />,
    attendance: <Attendance />,
    evaluations: <Evaluations />,
    profile: <Profile />,
};
// The route guard redirects users away from modules they cannot access.
function SectionPage() {
    const { user, authReady } = useAuth();
    const { section } = useParams();
    if (!authReady)
        return <AuthLoading />;
    if (!user)
        return <Navigate to="/login" replace />;
    if (!section || !(section in SECTIONS) || !canSee(user.role, section as Section))
        return <Navigate to={user.role === 'tutor' ? '/app/teaching' : '/app/dashboard'} replace />;
    return SECTIONS[section as Section];
}
function AuthLoading() {
    return <div role="status" aria-live="polite" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        {t('Verificando sesión…')}
    </div>;
}
function Guard({ children }: { children: ReactNode }) {
    const { user, authReady } = useAuth();
    if (!authReady)
        return <AuthLoading />;
    return user ? <>{children}</> : <Navigate to="/login" replace />;
}
function AppIndex() {
    const { user } = useAuth();
    return <Navigate to={user?.role === 'tutor' ? '/app/teaching' : '/app/dashboard'} replace />;
}
function Guest() {
    const { user, authReady } = useAuth();
    if (!authReady)
        return <AuthLoading />;
    return user ? <Navigate to={user.role === 'tutor' ? '/app/teaching' : '/app/dashboard'} replace /> : <Login />;
}
export default function App() {
    const { locale } = usePreferences();
    return <Routes key={locale}>
        <Route path="/" element={<Landing />} />
        <Route path="/cursos" element={<Landing />} />
        <Route path="/login" element={<Guest />} />
        <Route path="/app" element={<Guard>
            <AcademyProvider>
                <ActivityProvider>
                    <Shell />
                </ActivityProvider>
            </AcademyProvider>
        </Guard>}>
            <Route index element={<AppIndex />} />
            <Route path=":section" element={<SectionPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>;
}
