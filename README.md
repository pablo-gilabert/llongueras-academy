# Academia Llongueras — Trilingual Website & Academic Portal

**An institutional website and academic management portal for Academia Llongueras, developed by PG Labs with React, TypeScript and Firebase.** The project combines a responsive public experience with an authenticated workspace for managing academic records and workflows.

**Languages:** Spanish (default) · English · Brazilian Portuguese (ES / EN / PT-BR)

**Technology:** React 19 · TypeScript · Vite · React Router · Firebase Authentication · Cloud Firestore · CSS Modules · Lucide React · SweetAlert2

**Live website:** [Academia Llongueras](https://llongueras-academy.vercel.app/)

> **Project status:** An actively developed first institutional version, subject to the academy's review. Administrative workflows are implemented against actual, access-controlled Firestore records. Student self-service and full teacher grading workflows are **not yet implemented**. A deployed website or successful build is not evidence of a completed security audit.
>
> **Privacy and ownership:** This public repository contains application source and public-facing media only. Real student exports, credentials, Firebase Admin service accounts, and backups must remain outside the repository. Institutional names and assets remain the property of their respective owners; publication and usage rights should be confirmed with the academy.

## Key features

### Public institutional website
- Responsive, light-themed presentation of the academy, its history, leadership, training opportunities and media.
- Spanish, English and Brazilian Portuguese interfaces with localized program descriptions and accessible language selection.
- Search and category filters for public training offerings, contact information and campus access.
- A public marketing catalog kept separate from the private Firestore course records until institutional nomenclature is approved.

### Authenticated academic workspace

| Module | Current implementation |
| --- | --- |
| Authentication | Email/password sign-in using Firebase Authentication and trusted role claims. |
| Administration dashboard | Live Firestore student, course and enrollment counts, recent activity and navigation. |
| Student profiles | Search, filter, view, create and edit verified fields; preserve imported identity information and optional legacy values. |
| Teachers | Create and edit teacher profiles, active status and course assignments. |
| Courses | Inspect and edit existing course metadata; preserve stable Firestore document IDs. |
| Enrollments | Create, edit, review status and transfer enrollments without duplicating student profiles or discarding history. |
| Attendance | Register attendance and punctuality for existing enrollments and class dates. |
| Evaluations and grades | Create evaluations and record grades linked to existing academic records. |
| Tutor workspace | **Read-only** visibility of explicitly assigned courses for verified active tutor accounts. |
| Personal settings | Update permitted profile fields and account credentials through Firebase. |
| Action feedback | Localized SweetAlert2 confirmations and success messages after completed writes. |

The dashboard includes a **“Module under construction”** placeholder, not an invented financial balance. No billing or payment processing is implemented.

## Architecture

```text
public/
  flags/                    Language flags
  media/                    Public institutional media
src/
  components/               Shared UI, navigation and application shell
  context/                  Authentication, Firestore subscriptions, activity
  data/                     Public-facing institutional content
  i18n/                     Spanish-first UI, English and Portuguese dictionaries
  lib/                      Firebase client, role helpers and data mutations
  pages/                    Landing, students, courses, enrollment,
                            teachers, attendance, grades and profile features
  styles/                   Global tokens and shared visual rules
  App.tsx                   Route guards and feature routing
  Main.tsx                  Application entry point
firestore.rules             Version-controlled Firestore access policy
firebase.json               Rules deployment configuration
vercel.json                 SPA routing and browser security headers
scripts/                    Development checks (no private data)
```

The frontend uses feature-based components and CSS Modules. Firebase subscriptions live in contexts; authenticated writes are kept in dedicated mutation services. Code identifiers and explanatory comments are maintained in **English**, while the UI is translated independently.

## Roles and access boundaries

| Resource | Anonymous visitors | Tutor accounts | Administrator accounts |
| --- | --- | --- | --- |
| Public website and media | Yes | Yes | Yes |
| Student, enrollment, attendance and grade records | No | No | Yes |
| Course documents | No | Read assigned individual courses only | Yes |
| Teacher profiles | No | Own active, UID-linked profile only | Yes |
| Own account profile | No | Read/write validated personal fields | Read/write validated personal fields |
| Administrative activity log | No | No | Read; append validated entries |
| Student self-service portal | Not implemented | Not applicable | Not implemented |

**Critical distinction:** Client-side route guards and the fact that Vercel hosts a public URL **do not grant database access**. For Firebase Web SDK requests, the enforced authorization boundary is the **Firestore Security Rules currently deployed to the Firebase project**. Custom roles are assigned from a trusted Admin SDK environment, not from client-controlled fields.

### Security posture and known gaps

**Present in source:**
- Custom-claim-based administrator/tutor access; tutors are checked against active teacher documents and matching Firebase Auth UIDs.
- No anonymous reads/writes to private Firestore collections under the version-controlled rules.
- Own-account profile field allowlists; append-only activity log writes for approved administrators.
- UI confirmation before writes, record validation and selected atomic batches/transactions.
- SPA security headers including frame blocking, MIME-sniffing protection and a referrer policy.
- Explicit Git exclusions for private exports, admin keys and confidential archives.

**Still required before broad institutional rollout:**
- **Verify deployed rules independently.** The repository's `firestore.rules` is not proof of what is currently live. Vercel deployments do **not** publish Firestore rules.
- Add and run **Firebase Emulator security tests** covering anonymous reads, basic authenticated users, administrators, tutors (including revoked/deactivated profiles), cross-user account access, audit immutability and invalid writes. These tests are not yet automated in CI.
- Introduce stricter **server-enforced schemas and invariants** for privileged academic writes. The current rules grant administrators broad create/update/delete access; some validation, DNI uniqueness and course-capacity checks are implemented in the client and can be bypassed or raced.
- Review Google Cloud **IAM roles and service-account keys**. Firebase Admin SDK credentials can bypass client Firestore Security Rules; never embed them in the frontend or expose them in Vercel static assets.
- Evaluate Firebase **App Check**, Authentication email-enumeration protection and stronger sign-in controls/MFA for privileged accounts before enabling enforcement. None should be assumed active from this repository alone.
- Approve backup/restore, privacy retention, access review, incident response and monitoring procedures.

### Security checks before publishing

```bash
npm run security:check   # Detect sensitive paths or private-key material in tracked files
npm run typecheck        # Check application TypeScript types
npm run build            # Generate the production bundle
```

The repository check is a **guardrail against accidental secret commits**, not a penetration test or a replacement for GitHub secret scanning, Firebase Emulator tests or reviewing Git history.

For the Firestore policy itself, use the **Firebase Emulator Suite** and confirm the results against each expected role. After testing and approving the intended Firebase project, publish rule changes separately through Firebase Console or the Firebase CLI:

```bash
firebase deploy --only firestore:rules --project academia-llongueras
```

**Do not deploy rule changes without validating them first.** This command modifies the live authorization policy and is not performed by a GitHub PR or Vercel build.

## Local development

**Requirements:** Node.js 24.12+ and npm.

```bash
npm ci
npm run dev
```

Visit `http://localhost:5173`.

```bash
npm run typecheck
npm run build
npm run preview
npm run security:check
```

Firebase's Web SDK project configuration is intentionally part of the public frontend and **is not an administrator secret**. Authentication permissions, deployed security rules, Google Cloud IAM and optional App Check determine access. Private Admin SDK JSON keys, passwords and exports are never required to build or deploy the web app.

Any privileged account provisioning, role assignment or data import must run from a **separate trusted environment**. Do not place Admin SDK credentials, student CSVs, database snapshots or service-account exports in this repository, even temporarily.

## Deployment

1. Import this repository into Vercel with the **Vite** preset and **Node.js 24.x**.
2. Build with `npm ci` and `npm run build`, output directory `dist`.
3. Configure the correct production domain in Firebase Authentication authorized domains.
4. Check that Firestore's **active** rules match the reviewed policy, with anonymous access denied and tutor access limited to assigned courses.
5. Verify sign-in, authorization, save/rollback behavior, accessibility and language selection in a staging environment before institutional use.

`vercel.json` contains SPA rewrites and baseline HTTP headers. Vercel publishes the static website; it does **not** create academic data, grant roles, store private Admin SDK credentials, enforce Firestore rules or configure Firebase backups.

## Internationalization

Spanish is the default language. English and Brazilian Portuguese are available across institutional pages and the authenticated interface. Translation resources are separated into `src/i18n/Translations.ts`, `Portuguese.ts` and `PortuguesePublic.ts`.

Academic course **display names** may be localized in the UI, but Firestore IDs and stored names remain unchanged. For newly approved institutional names and descriptions, update all three locales and verify search, forms and accessibility labels together.

## Roadmap

- Review and approve the public course catalog, institution-provided assets and curriculum terminology.
- Configure verified teacher assignments and complete teacher-facing attendance and grading workflows.
- Build a student account model with strictly scoped access to each student's own enrollments, schedules, attendance and grades.
- Introduce timetables, academic groups, subject plans and institution-approved grading policies.
- Harden server-side invariants and authorization tests; establish backups, recovery and data-governance practices.
- Conduct keyboard, screen reader, responsive and end-to-end regression testing.

## Project information

**Developer:** Pablo Gilabert · PG Labs

**Suggested GitHub description:** Trilingual (ES/EN/PT-BR) academy website and Firebase-backed academic portal built with React 19, TypeScript, and Vite. Features role-based access, student and teacher records, courses, enrollments, attendance, grading, and responsive design.

This repository showcases a real-world frontend and Firebase architecture. It is **not** a release of the academy's private student data, a claim of completed institutional approval or a guarantee of production-grade security.
