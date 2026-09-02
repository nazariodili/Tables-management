# TODO / future increments

Ideas and follow-ups not yet done. Ordered roughly by priority.

## Refactor

- [ ] **Split the App render into sub-components.** `App.tsx` is still ~1.4k lines,
  mostly JSX. Extract the big render chunks into their own components:
  - `BottomBar` — the floating toolbar (add table/person, draw zones, zoom, save
    status, settings menu). ~25 props → consider grouping actions into a small
    context or a `toolbar` object to avoid heavy prop-drilling.
  - `GuestSidebar` — search, filters, tag chips, guest list, pool drop zone.
  - `PagesSidebar` — pages list + resize handle + context menu.
  - `CanvasViewport` — zoom/pan surface, shapes, tables, zone selection frame.
  - Trade-off: pure move, but each sub-component needs many props. Do it only if
    the prop surface can be kept clean (context or grouped props); otherwise the
    current structure (App + components/ + hooks/ + dnd.ts + i18n + types) is fine.

## Infra / repo

- [ ] Set the GitHub repo **Website** field (About section) to
  `https://tables-management-events.vercel.app/`
  (needs `gh` CLI or doing it manually in the repo settings — the README link is
  already correct).

## Nice-to-have

- [ ] Optional unit tests for the pure `applyMove` in `dnd.ts` (swap / pool /
  gap-insert null-consumption edge cases).
