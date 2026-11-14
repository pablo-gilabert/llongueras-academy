/** Role-based client navigation; Firestore rules independently enforce authorization. */
import type { Role } from '../Types';
export type Section = 'dashboard' | 'teaching' | 'students' | 'teachers' | 'courses' | 'enrollments' | 'attendance' | 'evaluations' | 'profile';
const access: Record<Section, Role[]> = {
    dashboard: ['admin'],
    teaching: ['tutor'],
    students: ['admin'],
    teachers: ['admin'],
    courses: ['admin'],
    enrollments: ['admin'],
    attendance: ['admin'],
    evaluations: ['admin'],
    profile: ['admin', 'tutor'],
};
export const canSee = (role: Role, section: Section) => access[section].includes(role);
