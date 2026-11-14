/** Shared types for authenticated academic users and their institutional roles. */
export type Role = 'admin' | 'tutor' | 'student';
export interface User {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    dni?: string;
    email: string;
    role: Role;
    studentId?: string;
    teacherId?: string;
    active: boolean;
}
