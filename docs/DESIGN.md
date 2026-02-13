# Design: Mobile vs Desktop

Bar and restaurant owners are on the go. **Step 1 of trust is a marketing site that feels perfect on mobile.** This doc defines how we handle layout, touch, and typography so the experience is consistent and intentional.

## Breakpoints

| Name    | max-width | Use |
|---------|-----------|-----|
| **Mobile** | 768px  | Hamburger nav, single-column layout, touch-first controls. |
| **Narrow**  | 600px  | Hero content stacked (image above copy optional), full-width CTAs, tighter sections. |
| **Small**   | 480px  | Minimum safe padding, slightly smaller type, compact cards. |

Defined in `globals.css` as `--bp-mobile`, `--bp-narrow`, `--bp-small` (for reference; media queries use numeric values).

## Touch targets

- **Minimum size:** 44×44px (`--touch-min`) for all interactive elements on mobile (links in nav drawer, buttons, CTAs).
- Buttons and primary CTAs use `min-height: var(--touch-min)` and flex centering so they’re easy to tap with a thumb.

## Spacing (landing)

- **Desktop:** `--landing-page-x: 2rem`, `--landing-section-y: 1.25rem`.
- **Mobile (768px):** `--landing-page-x: 1.25rem`; section and footer padding use these tokens.
- **Narrow (600px):** Hero and sections use same horizontal padding for consistency.
- **Small (480px):** `--landing-page-x: 1rem`, `--landing-section-y: 1rem` so content stays readable without feeling cramped.

All landing sections (hero, how, report, pricing, FAQ, footer) use the same horizontal padding variable so gutters stay consistent at every breakpoint.

## Typography (landing)

- **Desktop:** Hero H1 `2.25rem`, hero sub `1.1rem`, section H2 `1.5rem`.
- **Narrow (600px):** Hero H1 `1.75rem`, hero sub `1rem`, H2 `1.35rem`.
- **Small (480px):** Hero H1 `1.5rem`, H2 `1.25rem`; step and body text slightly reduced; line-height kept for readability.

Variables: `--landing-hero-h1`, `--landing-hero-sub`, `--landing-h2`. Set once per breakpoint under `.landing` so all components inherit.

## Layout patterns

- **Header:** Above 768px = horizontal nav; at or below 768px = hamburger + full-width drawer. Drawer closes on link click or resize.
- **Hero:** Desktop = side-by-side copy + image; narrow mobile = stacked, CTAs full-width and vertically stacked.
- **Sections:** Single column on mobile; steps grid becomes 1 column at 768px; report and pricing stack graphic/card above copy at 600px.
- **Footer:** Same horizontal padding as sections; font size can step down at 480px.

## Safe area (notched devices)

For devices with notches or home indicators, consider adding `env(safe-area-inset-left/right)` to horizontal padding of the main content so content never sits under the notch.

## Where it lives

- **Tokens and comments:** `src/app/globals.css` (top: design comment block; `:root` and `.landing` variables; “Landing: Mobile” media blocks).
- **Landing layout:** `src/app/page.tsx`.
- **Header (hamburger):** `src/components/LandingHeader.tsx` (uses 768px to show/hide drawer).

Keeping these patterns in one place makes it easy to keep the marketing site “perfect on mobile” as we add pages or components.
