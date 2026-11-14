# Academia Llongueras — Academy Website & Management Portal

A responsive, trilingual academy website and role-based academic management portal built as an independent software-engineering portfolio project. It pairs a public-facing institutional experience with a protected Firebase-backed workspace for academy administrators and teachers.

**Stack:** React 19 · TypeScript · Vite · React Router · Firebase Authentication · Cloud Firestore · CSS Modules · Lucide React

> [!IMPORTANT]
> **Independent portfolio project — not an official Academia Llongueras website.** Brand references, photographs, and institutional information belong to their respective owners. This repository does not imply affiliation or endorsement. The authenticated workspace connects to real, access-controlled Firestore collections: **never use publicly shared test credentials or commit student records, exports, or private keys**.

## What it does

The **public website** presents the academy's history, educational methodology, areas of study, media gallery, and contact details. It includes responsive navigation, accessible interactions, Spanish-first copy with English and Brazilian Portuguese options, and a consistent light theme.

The **authenticated workspace** provides the following implemented functionality:

| Area | Available functionality |
| --- | --- |
| Authentication | Firebase email/password sign-in with custom-claim-based administrator and tutor roles; session verification and protected routes. |
| Dashboard | Firestore-backed course, student, and enrollment counts; administrator activity feed; quick navigation. |
| Students | Search, filter, view, create and edit Firestore student profiles without duplicating records across multiple courses. |
| Teachers | Firestore-backed teacher profiles, activity status, and assignments to existing courses. The collection may initially be empty. |
| Courses | Read and update existing Firestore course details; link students and teachers to courses. |
| Enrollments | View, create, edit, change status, and transfer course enrollments while retaining history. |
| Attendance | Record attendance by class date and enrollment, including individual saves and late-arrival tracking. |
| Evaluations | Create course evaluations and record grades associated with existing enrollments. |
| Tutor portal | Read-only access to courses explicitly assigned to a verified, active teacher account. |
| Account settings | Edit personal profile and supported account credentials through Firebase. |

**Data provenance:** Academic records displayed by the workspace come from Firestore, subject to Security Rules. The dashboard deliberately retains **one illustrative value**, clearly labelled *"Saldo mensual pendiente (inventado): $ 1.043.000"*. It is **not** a billing subsystem or a calculation based on financial records. No demonstration-data mode or sample student directory is shipped.

## Architecture

```text
llongueras-academy/
├── public/
│   ├── flags/                    # Locale icons
│   └── media/                    # Public presentation assets
├── src/
│   ├── components/               # Reusable UI and authenticated shell
│   ├── context/
│   │   ├── AuthContext.tsx        # Verified Firebase session
│   │   ├── AcademyContext.tsx     # Firestore record subscriptions
│   │   └── ActivityContext.tsx    # Administrative activity stream
│   ├── data/                     # Sourced, public academy content
│   ├── i18n/                     # UI translations and display preferences
│   ├── lib/                      # Firebase setup, permissions, mutations
│   ├── pages/                    # Route-level features and local CSS Modules
│   │   ├── Landing/
│   │   ├── Dashboard/
│   │   ├── LiveAcademy/          # Shared student/course/enrollment views
│   │   ├── Students/             # Route boundary for student management
│   │   ├── Courses/
│   │   ├── Enrollments/
│   │   ├── Teachers/
│   │   ├── Attendance/
│   │   ├── Evaluations/
│   │   ├── Teaching/
│   │   ├── Login/
│   │   └── Profile/
│   ├── styles/                   # Global styles and theme tokens
│   ├── App.tsx                   # Routes and authorization guards
│   └── Main.tsx                  # Application bootstrap
├── firestore.rules               # Firestore access control
├── firebase.json                 # Optional CLI rules deployment configuration
├── vercel.json                   # SPA routing and HTTP security headers
├── .nvmrc                        # Node 24
└── package.json
```

The structure favors feature-oriented page folders, TypeScript data models, CSS Modules, and isolated Firestore mutation services. The `LiveAcademy` module currently shares some presentation logic between the closely related student, course, and enrollment routes; it can be split further as those features grow without altering the persisted document IDs.

### Security model

- Institutional privileges are granted through **trusted Firebase Authentication custom claims**, never through a client-side role switch.
- Tutor access additionally checks an active `teachers/{teacherId}` document bound to the authenticated `authUid`. Teacher accounts are provisioned and linked separately by an authorized administrator.
- **Firestore Security Rules** are the authorization boundary. Navigation guards only improve the client experience; they do not replace server-side access checks.
- Academic mutation modules validate records and use transactions for critical operations. Some business constraints, including global uniqueness and concurrent course capacity allocation, still require stronger server-side enforcement before wider institutional use.
- Audit entries track administrative actions, but a mature production system still requires backup and recovery procedures, security rule tests, retention policies, and operational monitoring.

## Getting started

**Requirements:** Node.js **24.12+** (Node 24 LTS) and npm. Firebase 13 dependencies require this minimum runtime. Do not install the privileged Firebase Admin SDK in this frontend repository.

```bash
npm ci
npm run dev
```

Open `http://localhost:5173`. Other useful commands:

```bash
npm run typecheck   # TypeScript validation
npm run build       # TypeScript + production bundle
npm run preview     # Serve the production build locally
```

### Firebase configuration

The project currently initializes the **public Firebase Web SDK configuration** for the `academia-llongueras` project in `src/lib/Firebase.ts`. Firebase web-client configuration is not an Admin SDK credential and may be present in frontend source. **Never** commit service-account JSON files, Firebase Admin keys, imported CSVs, database exports, or actual user passwords.

A privileged administrator must provision users and configure their **custom claims** through a trusted environment. The Firestore `teachers` collection is populated when actual profiles are created through the administration UI; the application does not seed invented teachers or users. Keep all migration and account-linking tooling outside the public repository.

**Important:** `firestore.rules` is source-controlled but is **not deployed automatically by Vercel**. After reviewing the rules and confirming the correct Firebase project, publish them through Firebase Console or using the Firebase CLI:

```bash
firebase deploy --only firestore:rules --project academia-llongueras
```

This command changes the live project's database rules. Review and test permissions with the Rules Playground / emulator **before executing it**, especially if the production Firebase project is already in use.

## Deployment on Vercel

1. Push the project to a GitHub repository. Keep the repository root at the folder containing `package.json`.
2. In Vercel choose **Add New → Project**, import the GitHub repository, and select **Vite** as the framework.
3. Verify **Node.js 24.x**, install command `npm ci`, build command `npm run build`, and output directory `dist`. The repository's `package.json` and `vercel.json` include these defaults.
4. Deploy. The included SPA rewrite supports refreshing deep routes such as `/login` and `/app/students`.
5. In **Firebase Console → Authentication → Settings → Authorized domains**, add the assigned `*.vercel.app` production domain (and any custom domain). This authorization is required for Firebase Authentication to work on the deployed site.
6. Confirm Firestore Security Rules are published, then verify anonymous access is denied for academic records, administrators can perform allowed operations, and tutors only see their assigned courses.

A Vercel deployment publishes only the static frontend. It **does not** create student/teacher documents, set Firebase custom claims, deploy Firestore rules, or replace backup and monitoring procedures. Domain-registration costs, if applicable, are handled separately by the registrar.

## Roadmap / known limitations

The current implementation is a **working portfolio foundation**, not a fully commissioned student-information system. Priorities before an institutional production rollout include:

- Institution-approved teacher account provisioning, complete tutor workflows, and faculty/student authorization policies.
- Server-enforced uniqueness, transactional capacity allocation, stricter field validations, and more comprehensive Firestore rules tests.
- Real billing/payment models if required; the dashboard's monthly balance is deliberately illustrative.
- Course groups, scheduling, grade policies, exports, recovery procedures, audit retention, and monitoring.
- Accessibility audits, end-to-end tests, and documented data-governance/privacy approval.

## Acknowledgements and attribution

Academia Llongueras and associated trademarks belong to their respective owners. Public institutional information was reviewed against published sources, including [Llongueras Argentina](https://llonguerasargentina.com.ar/pages/historia), [Llongueras Institute](https://llonguerasinstitute.com/nosotros/el-metodo/), and public [academy announcements](https://www.schoolandcollegelistings.com/AR/Buenos-Aires/200286546679031/Academia-Llongueras-Argentina). The design does not claim official affiliation, ownership of brand assets, or permission to redistribute third-party media. Confirm asset usage rights before publishing a public repository.

**Author:** Pablo Gilabert · PG Labs
