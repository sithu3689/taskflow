## Development Workflow

1. The developer writes and updates code locally.
2. The frontend and backend are tested locally.
3. Production builds are checked using:

### Frontend build

```bash
cd client
npm run build
```

### Backend build

```bash
cd server
npm run build
```

4. Git is used to track project changes.
5. Changes are staged and committed:

```bash
git add .
git commit -m "Describe the changes"
```

6. The latest commit is pushed to GitHub:

```bash
git push
```

---

## Continuous Integration

Continuous Integration checks that the frontend and backend compile successfully whenever code changes are pushed.

The expected CI workflow is:

```text
Developer
    ↓
Git Commit
    ↓
GitHub Repository
    ↓
GitHub Actions
    ↓
Install Dependencies
    ↓
Build Frontend and Backend
    ↓
Pass or Fail Result
```

The CI process should:

1. Check out the latest source code.
2. Install frontend dependencies.
3. Run the frontend production build.
4. Install backend dependencies.
5. Run the backend production build.
6. report whether the workflow passed or failed.

---

## Continuous Deployment

A suitable deployment workflow for TaskFlow is:

```text
GitHub Repository
        ↓
Frontend → Vercel
Backend → Render or Railway
Database → Hosted MySQL service
```

The frontend communicates with the deployed backend using the configured API URL.

The backend connects to the hosted MySQL database through the `DATABASE_URL` environment variable.

---

## Environment Variables

### Frontend

```env
NEXT_PUBLIC_API_URL=https://your-backend-url/api/v1
```

### Backend

```env
DATABASE_URL=your-hosted-database-url
JWT_SECRET=your-secure-jwt-secret
PORT=5000
```

Real secrets must not be committed to GitHub.

---

## Current CI/CD Status

| CI/CD Item | Status |
|---|---|
| Git version control | Completed |
| Public GitHub repository | Completed |
| Frontend production build | Completed |
| Backend production build | Completed |
| `.env.example` files | Completed |
| GitHub Actions workflow | Not yet implemented |
| Live frontend deployment | Pending |
| Live backend deployment | Pending |
| Hosted database | Pending |

---

## Future Improvement

A GitHub Actions workflow can be added to automatically run frontend and backend builds whenever code is pushed or a pull request is created.

This will help detect build errors before deployment.