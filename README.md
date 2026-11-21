# Auth web app

The sign in and account pages for the [OAuth service](../go-auth). React, Vite and TypeScript. It is a separate project that talks to the API over HTTP and shares nothing with it but the contract.

- Sign in and sign up form with an email field (not wired yet) and Google, Facebook and Telegram
- Account page: the profile, connected providers, connect and disconnect, sign out
- The access token lives in memory only. The refresh token is an httpOnly cookie the API sets, which the browser sends on its own

## Run

```bash
cp .env.example .env     # VITE_API_URL is the API address
npm install
npm run dev              # http://localhost:5173
```

The API must allow this app's origin: set its `FRONTEND_URL` to the address where this app is served, for example `http://localhost:5173`.

```bash
npm run check            # format, types, lint, tests and the build
```

`VITE_API_URL` and `VITE_SITE_URL` are read when the app is built, so a production build needs both set at that time (`VITE_SITE_URL` is this app's own public https address, see SEO below; the build stops without it):

```bash
VITE_API_URL=https://api.example.com VITE_SITE_URL=https://app.example.com npm run build     # static files in dist/
```

## How it talks to the API

| Call                           | When                                                                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /auth/refresh`           | On page load, to turn the cookie into an access token. Only one call is ever in flight, because the API treats a second use of the same refresh token as a theft and ends the session. This also holds under React StrictMode, which runs effects twice in development |
| `GET /me`                      | After a refresh, for the profile and the linked providers                                                                                                                                                                                                              |
| `GET <API>/auth/{provider}`    | A plain link. The browser leaves for the provider and comes back to the API callback, which redirects to `/auth/callback` here                                                                                                                                         |
| `POST /auth/link/{provider}`   | Connect. Returns the provider URL, then the browser goes there                                                                                                                                                                                                         |
| `DELETE /auth/link/{provider}` | Disconnect. The last provider cannot be removed                                                                                                                                                                                                                        |
| `POST /auth/logout`            | Sign out                                                                                                                                                                                                                                                               |

`refresh` and `logout` send `X-Requested-With: fetch`, which the API requires. When an access token has expired the client refreshes once and repeats the call, and never loops. Error codes from the API are turned into fixed messages (`src/messages.ts`); a code that is not on the list is never shown.

The API redirects back with `?error=<code>` or `?linked=<provider>`. The app shows the matching message once and removes the query from the address bar.

## SEO and sharing

This is a sign-in app, so the goal is not ranking for keywords but being found by name, looking right when a link is shared, and keeping private pages out of search results.

| What                           | How                                                                                                                                                                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Title and description          | A fixed title and description in `index.html`, within the lengths search engines show (title up to 60, description 70 to 160 characters). The title then follows the page: `Sign in · Alifco`, `Create account · Alifco`, `Your account · Alifco` |
| Indexing                       | The sign in page is indexable. The account page sets `noindex, nofollow` while it is shown. `robots.txt` also disallows `/auth/` and `/settings/`, which are the addresses the API redirects to after a login or a link                           |
| Canonical address              | One `canonical` link and `og:url` on the public origin, so the same page is not counted under several addresses                                                                                                                                   |
| Link previews                  | Open Graph and Twitter card tags with a 1200 by 630 image (`public/og-image.png`) and alt text                                                                                                                                                    |
| Icons                          | Favicons (16, 32), an Apple touch icon (180), a web manifest with 192 and 512 icons and the theme colour                                                                                                                                          |
| `robots.txt` and `sitemap.xml` | Generated at build time by `plugins/seo.ts` from `VITE_SITE_URL`, so they always carry the real address and never a placeholder                                                                                                                   |
| Structured data                | A `WebSite` entry in JSON-LD                                                                                                                                                                                                                      |
| Without JavaScript             | A `noscript` message, since the pages are drawn by the browser                                                                                                                                                                                    |
| Speed                          | The logo has fixed dimensions, which avoids layout shift, is preloaded and has high fetch priority, because it is the largest element on the first screen. No web fonts, no third-party scripts                                                   |

`VITE_SITE_URL` must be an https address for a production build, otherwise the canonical address and the sitemap would point at the wrong place; the build stops with a message. `npm test` checks all of the above (`plugins/seo.test.ts`): tag lengths, that every icon exists and has the size it declares, the manifest, the structured data, what `robots.txt` and the sitemap contain, and the build guard.

Not done: the pages are drawn in the browser, so a crawler that does not run JavaScript sees the `noscript` text and the tags above, not the form. For a sign-in page that is acceptable; a marketing site would need pre-rendering.

## Layout

Split by feature, not by kind of file. Everything a feature needs lives in its folder, tests next to the code they cover.

```
plugins/             the Vite plugin behind robots.txt, sitemap.xml and the canonical address
src/
  main.tsx
  app/                 the shell: App, the API address, wiring
  features/
    session/           restoring the session, sign out, connect and disconnect, useAuth
    sign-in/           the sign in and sign up page, the email form, the provider links
    account/           the account page: profile, provider rows, connect and disconnect buttons
  shared/
    api/               the API client (single-flight refresh, one retry on an expired token) and its types
    notice/            the message shown at the top of the page
    ui/                ProviderIcon
    lib/               error messages, formatting, useBusy, usePageMeta (title and robots per page)
```

Imports use the `@/` alias for `src/`, and inside one feature they are relative. The direction of dependencies is fixed and checked by the linter (`npm run lint` fails on a violation): `app` may use everything, a feature may use `shared` and the session feature, features do not import each other, and `shared` imports no feature.

## Tests

`npm test` runs Vitest with Testing Library against a fake API. They cover the client (one shared refresh, one retry, network failures, logout), every screen and the redirect messages, and refreshing exactly once under StrictMode. Each important behaviour was checked by breaking it on purpose and watching a test fail: the shared refresh, the retry limit, the disconnect confirmation, unknown codes never being shown, and the landing message appearing only once.

## Not done

- Email sign in is only a form: it validates the address and says it is not available yet.
- No router library: the three paths the API redirects to (`/`, `/auth/callback`, `/settings/accounts`) all show the same page, and the query decides the message.
- No browser-level test drives a real provider login.
