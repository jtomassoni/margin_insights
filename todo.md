# Margin Insights — Living TODO

## ✅ Completed (this pass)

- [x] Design tokens (HSL) in `.landing`: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--muted-foreground`, `--card`, `--card-foreground`, `--border`, `--ring`, `--radius`
- [x] Warm gradient background (slate-50 → bluethe -50 feel)
- [x] Hero copy: headline "Know your true margin. Down to the ingredient." + subhead (best-sellers / leaks / POS data)
- [x] CTA hierarchy: primary "Bar demo — drinks & pour cost", secondary outline "Restaurant demo — food menu"
- [x] Micro-trust line under CTAs: "Works with Square, Toast & CSV exports. No POS login required."
- [x] Hero image container: shadow-2xl, ring, optional radial glow; no boxed stock-photo feel
- [x] Value cards row (3 cards): Spot low-margin best-sellers, Catch over-pouring & comps, Price suggestions from real costs
- [x] Nav: single primary CTA "Bar demo" in header; full links + both demos in hamburger
- [x] Mobile-first hero: stack order headline → subhead → CTAs → trust → image
- [x] Desktop (≥1024px): two-column hero, image slightly larger on right
- [x] FAQ POS copy updated to Square, Toast & CSV (matches hero trust line).
- [x] Report image path fixed: `report-grapgic.png` → `report-graphic.png`.
- [x] Demo-dashboard wrapped in Suspense so build passes (useSearchParams).
- [x] Focus-visible styles for landing: buttons, nav links, hamburger toggle.

---

## 🔜 Next (prioritized)

1. **Above-the-fold tune** — On small phones, consider shortening value-card copy or reducing padding so all three cards feel “above fold”.
2. **Contrast check** — Run WCAG contrast checker on muted text and primary button (aim for AA).
3. **Report image asset** — Ensure `public/images/report-graphic.png` exists (path fixed from `report-grapgic.png`).

---

## 💡 Experiments / ideas

- **A/B copy** — Test alternate headlines: e.g. "Your best-sellers might be losing you money" vs current.
- **Dark hero variant** — Optional dark hero block for contrast (e.g. dark blue bar with same copy).
- **Testimonial block** — Short quote from a bar/restaurant owner + optional headshot.
- **POS logos row** — "Works with Square, Toast & CSV" as a row of logos under hero or in footer.
- **shadcn/ui** — If you add Tailwind later, migrate buttons/cards to shadcn Button and Card for consistency.

---

## 🐛 Bugs

- None logged yet. Add any layout/contrast/behavior issues here.
