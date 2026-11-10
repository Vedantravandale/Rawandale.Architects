# Rawandale Architects — Portfolio Website

A responsive architecture and interiors portfolio with Home, Selected Work, Services, Studio and Contact pages, a dedicated Topmate navigation link, and local project photography. Visitors can send project enquiries from the Contact page. Each enquiry is saved to the database and appears in the password-protected Admin inbox.

## Run on Windows

Double-click `RUN-WEBSITE.bat` in File Explorer. Keep the terminal window open while using the site. The website opens at `http://localhost:3000`; use the **Admin** tab or `http://localhost:3000/admin.html` to review enquiries.

The local `.env` file holds the admin and optional email settings. `data/store.sqlite` keeps local inquiries. Both are ignored by Git. The admin password is also saved in `ADMIN-LOGIN.txt` for local reference.

## Gmail enquiry notifications

The form always saves enquiries to the database. To also send an email alert, set these values in `.env`:

```env
GMAIL_USER=your-studio-address@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
INQUIRY_TO_EMAIL=where-to-receive-alerts@gmail.com
```

Use a Gmail App Password for the sender account, not its normal password. Google requires 2-Step Verification to create an App Password. Keep the value private and do not commit `.env`. If Gmail delivery is unavailable, the enquiry remains in the Admin inbox. For a hosted site, OAuth 2.0 is preferable to an App Password; see [Nodemailer’s Gmail guide](https://nodemailer.com/guides/using-gmail).

## Database and hosting

The local server uses SQLite in `data/store.sqlite`. To host the site with a managed PostgreSQL database, set `DATABASE_URL` and, if required by your provider, `DATABASE_SSL=true` in the hosting environment. Set `ADMIN_PASSWORD`, `SESSION_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `INQUIRY_TO_EMAIL`, and `BASE_URL` as private host environment variables. Do not commit real secrets.

The website needs Node.js 22.5 or newer. Run `pnpm install` (or `npm install`) and `pnpm start` (or `npm start`) from the project directory. On Windows, use `RUN-WEBSITE.bat` for the local setup.

## Project files

- `public/index.html`, `public/portfolio.html`: home and selected project work
- `public/images/`: saved project photographs used in galleries and page backgrounds
- `public/services.html`, `public/studio.html`, `public/contact.html`: studio pages and inquiry form
- `public/admin.html`, `public/admin.js`: private inquiry dashboard
- `public/inquiry.js`: inquiry form submission
- `database.js`: local SQLite and hosted PostgreSQL storage
- `.env.example`: environment variable template
- `CHANGELOG.md`: project changes from initial redesign through current work

The public `/shop.html` route redirects to Home. Legacy product/payment API code is not linked from the public website.

