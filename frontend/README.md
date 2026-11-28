# Gather wedding check-in frontend

Responsive React app for the wedding administrator and admission guards. The code is split into API, authentication, shared components, guest-management features, and page modules under `src/`.

## Local development

1. Start the backend on port `3000` and ensure its PostgreSQL migrations and users are ready. See [`../backend/README.md`](../backend/README.md).
2. From `frontend/`, install and start Vite:

   ```powershell
   npm ci
   npm run dev -- --host 0.0.0.0
   ```

3. Open the Vite URL, sign in with an admin or guard account, and use the role-appropriate workspace. During development, `/api` requests are proxied to `http://localhost:3000`.

Set `VITE_API_BASE_URL` when the API is not at the same origin or when building for deployment. For example, use `https://your-api.example.com/api`. Do not put credentials in frontend environment variables.

## Pages

- `/login` — shared sign-in page for admin and guards.
- `/admin` — guest search/filter, attendance cards, register/edit/import, QR and invitation-card downloads, bulk QR ZIP, issue/reissue/revoke.
- `/scanner` — guard camera scanner, manual token/URL entry, verification, guest identity review, and explicit admission confirmation.
- `/check-in?token=...` — QR destination that forwards its token to the authenticated scanner. A guard signs in before the token is verified.

The scanner uses `@zxing/browser`. Camera access works on `localhost` for development and requires HTTPS on a phone or production host. Admission remains online-only; the PWA caches the application shell, not check-in API responses.

## Build and lint

```powershell
npm run build
npm run lint
```
