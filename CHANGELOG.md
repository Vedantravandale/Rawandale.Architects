# Project Change Log

This file records the work completed on the Rawandale Architects website from the initial redesign through the latest hosting and imagery updates.

## 2026-11-10 — Portfolio-first redesign

- Rebuilt the homepage around the studio, selected projects, services and project enquiries with a stronger editorial layout and image-led hero.
- Renamed the primary navigation item to **Home** and removed Shop and Cart from all visitor-facing navigation.
- Removed the public product catalogue and checkout from the homepage; `/shop.html` now redirects to Home.
- Updated service and contact copy to focus on architecture, interiors and design detailing. Kept the existing admin area outside the public navigation.
- Updated README guidance and refreshed shared desktop/mobile styling.

## 2026-11-10 — Project enquiries and admin inbox

- Added an accessible project enquiry form with name, email, optional phone, project type and message fields.
- Added inquiry storage to SQLite and PostgreSQL, plus admin-only list and status update endpoints.
- Replaced the store-focused admin screen with a password-protected enquiry inbox and counts for total, new and contacted requests.
- Added an Admin navigation link across public pages.
- Added optional Gmail notifications through Nodemailer. Configure `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `INQUIRY_TO_EMAIL` in `.env`; inquiries are saved even if email is not configured or a notification fails.

## 2026-11-10 — Project photography and Topmate

- Renamed five supplied image files in `public/images/` and placed them across the homepage, portfolio gallery and page backgrounds.
- Expanded selected work to show all eight available project images with responsive, lazy-loaded cards.
- Added a dedicated Topmate link in the main navigation on each public page.
- Renamed the navigation label to **Study Material** while keeping the Topmate profile destination.
- Applied a cohesive warm architectural theme with sage/olive accents, refined controls, responsive nav spacing, image hover treatment and visible keyboard focus states.
- Added the supplied Rawandale Architects logo asset and replaced the monogram/text lockup in public page headers, footers and the admin header.
- Cropped the logo’s excess white margins and made the background transparent for a clean fit on the site’s warm surfaces.
- Added Cormorant Garamond display headings and DM Sans body text with local fallback stacks across the public and admin pages.
- Renamed the external Topmate navigation label from Study Material to Store at the user's request.
- Removed the India location text from the homepage, Contact and Studio hero labels.
- Replaced the sage/bronze palette with a black, white and soft-stone theme to coordinate with the supplied black logo.
- Reduced the logo size in the header and footer while retaining its aspect ratio.
- Simplified the page backgrounds to a consistent white, light-gray and charcoal studio palette.
- Added subtle gold accents to selected emphasized words and labels.

## Local startup convenience

- Added `RUN-WEBSITE.bat` for Windows File Explorer. It checks Node.js and `.env`, installs dependencies when missing, starts the site, and opens the storefront after a short delay.
- Documented that `.env` stores local configuration, `data/store.sqlite` keeps local store records, and `ADMIN-LOGIN.txt` keeps the password-only admin login. Credential files and the local database remain ignored by Git.

## 2026-11-10 — Multi-page site, Instagram imagery, and hosting database

### Pages and navigation

- Turned the original long homepage into a connected multi-page site with dedicated Portfolio, Services, Shop, Studio, and Contact pages.
- Updated the navigation across the site and added responsive mobile navigation, clearer calls to action, and consistent page footers.
- Kept the existing digital shop connected to its product API, search/filter controls, cart, and checkout flow.

### Portfolio images and backgrounds

- Used images from the user-provided public Rawandale Architects Instagram profile: [@rawandale_architects](https://www.instagram.com/rawandale_architects/).
- Saved local copies in `public/images/` so the site does not depend on Instagram image URLs while rendering.
- Added the images to portfolio cards, the homepage feature panel, and photo backgrounds on the Portfolio, Services, Shop, Studio, and Contact pages.
- Added image descriptions for accessibility and a note to confirm portfolio captions before publication.
- Current image files:
  - `public/images/bedroom-headboard.jpg`
  - `public/images/curved-ceiling.jpg`
  - `public/images/night-sky-lounge.jpg`

### Database and hosting setup

- Added a database layer in `database.js` that uses local SQLite when `DATABASE_URL` is blank and PostgreSQL when a hosted PostgreSQL URL is provided.
- Added database tables for products, orders, and hashed admin sessions.
- Added one-time import behavior for existing local SQLite or legacy JSON product/order data when the destination database is empty.
- Added the `pg` dependency and updated the Node.js minimum version to 22.5 for the built-in SQLite driver.
- Added `DATABASE_URL` and `DATABASE_SSL` to `.env.example` and documented the hosted database setup in `README.md`.

### Run and verification

- Installed the project dependencies and started the Express app at `http://localhost:3000/`.
- Confirmed the homepage, five page routes, three image assets, and product API returned HTTP 200.
- The active local app uses SQLite. PostgreSQL support is ready, but a hosted PostgreSQL database is not connected yet because no `DATABASE_URL` has been configured.

### Remaining deployment configuration

- Create a managed PostgreSQL database with the chosen hosting provider and set `DATABASE_URL` on the host. Set `DATABASE_SSL=true` if that provider requires TLS.
- Set the production `ADMIN_PASSWORD`, `SESSION_SECRET`, Razorpay credentials, and canonical `BASE_URL` as host environment variables.
- Move uploaded files from `private-files/` to persistent disk or object storage if the host uses an ephemeral filesystem.

## Earlier site work

- Added dedicated page layouts and content for Portfolio, Services, Studio, Contact, and Shop, plus responsive styling for desktop and mobile.
- Updated the homepage navigation to link to the separate pages.
- Added consistent typography, content hierarchy, service lists, process steps, contact details, project cards, and calls to action.
- Kept example portfolio copy clearly identified for review before publication.

