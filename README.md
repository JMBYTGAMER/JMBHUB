# JMBHUB

JMBHUB is a modular personal hub for games, tools, Minecraft utilities, AI, files and support.

## Project layout

- `index.html` — landing page
- `pages/` — portal screens
- `css/` — visual styles
- `js/` — application modules
- `assets/` — icons and media
- `firebase/` — access/data security configuration
- `functions/` — optional secure server-side integrations

## Account setup

The sign-in screen supports email/password accounts, password recovery, Google sign-in and an optional Discord sign-in connection.

To activate account services, add your web application configuration in `js/config/firebase-config.js` and enable the desired sign-in providers in your account project.

Keep all private server credentials out of this repository.

## Publishing

Upload the project files with `index.html` at the root of your site. Use a static web host or your preferred deployment service.

## Notes

The portal is intentionally modular so new games, tools and services can be added without rebuilding the whole interface.
