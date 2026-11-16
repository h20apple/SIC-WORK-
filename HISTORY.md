# SIC Sheet — Project History

**Project:** Despatch Short Interval Control (SIC) Sheet  
**Developer credit:** Ross Hutton  
**Repository:** https://github.com/h20apple/SIC-WORK-  
**Live site:** https://h20apple.github.io/SIC-WORK-/  
**Period covered:** 24 October–16 November 2026

> This document records requirements, prototypes, changes discussed and verified GitHub actions. A requested or drafted feature is not automatically confirmed as deployed or working on the live website.

## 24–25 October 2026 — Paper form to digital concept
- Started from the paper Despatch Short Interval Control (SIC) Sheet used at the workplace.
- Goal: retain the original sheet appearance, enable editable entry on iPhone and desktop, and print clearly on A4 landscape.
- Required columns: Start Time; Finish Time; R-code; Product Description; Date Code; Order Update (Depot); Planned Packs; Packs Produced; LOMA Packs Total; OAL Total Reads; Despatch Waste; Dell Rejects; Dell Burst Packs; Samples/Temp Packs; Units per Tray; Total Trays; Extra Loose Packs; Extra Trays; Comments.
- Metadata: Date, Dell, Shift, Team Leader, Section Leader/Manager, Line, Actions/Comments, Version and Page.
- Early worked example: R5535, 4 Bean, 06:00 start, date code 30/10/2026, 4,624 planned packs and 6 per tray.

## 26 October 2026 — Interactive SIC form
- HTML form preserving paper layout and allowing rows to be edited.
- UK dates (DD/MM/YYYY) and 24-hour times (00:00).
- Automatic R-code lookup, accepting codes with or without leading R.
- Core calculation: Packs Produced = Units per Tray × Total Trays.
- Continuation rows: '=' in start/finish fields indicates continuation of the same product; totals carried into the completed product's Comments field.
- OAL green highlight when OAL reads exceed Packs Produced.
- Order Update green toggle.
- Extra Trays calculated from Extra Loose Packs and Units per Tray.
- Mobile-friendly view, sticky controls, autosave/backup concepts and A4 landscape printing, including readable printed input values.
- Example product R5538: OC Honey Roast Salmon Pasta Salad (Small), start 06:00, 90 planned packs, 10 per tray (9 planned trays). Unprovided actual production fields remained blank.
- Product catalogue supplied for R5538, R5483, R5537, R5482, R5746, R5739, R5738, R5533, R5485 and R5539.

## 26–27 October 2026 — Redzone, version 1.1 beta and usability
- Redzone summaries changed to show separate Packs and Waste totals.
- Dell Rejects added to Despatch Waste for Redzone Waste.
- Samples/Temp Packs and Dell Rejects received optional circular markings.
- OC-specific order-update wording and tray-count experiments were discussed, then depot automatic text was removed in favour of manual entry.
- Photo upload feature removed at user request.
- Version label: '1.1 beta by Ross Hutton'.
- Fix requests included restoring multiple rows after a version showed only one, ensuring printable text, and preserving the original full layout.

## 9–10 November 2026 — Final Product Sheet integration concepts
- Proposed a combined site with two top tabs: 'SIC' and 'Final Product'.
- Final Product Sheet to follow the photographed work form, including all fields and correct A4 fit (not clipped at Floor Wedge).
- Shared product lookup by R-code and UPC.
- Proposed operator, Charge Hand, supervisor, manager and technical permissions, with review/approval and future paperwork uploads.
- Input controls: UK dates, tick/X selectors, numeric-only fields except specified free-text depot start, and Charge Hand access to normally restricted fields.
- HTML prototypes and local saving/archives were discussed; full shared multi-user backend and production deployment were not verified.

## 15 November 2026 — SIC v1.2 draft and data reset
- Retained original SIC layout, product lookup, continuation logic, autosave, print format and Redzone summaries rather than switching to a simplified design.
- Requested non-OC Packs Produced calculation: Units per Tray × Total Trays + Despatch Waste + Dell Rejects + Dell Burst Packs + Samples/Temp Packs + Extra Loose Packs.
- OC products retain Units per Tray × Total Trays.
- Important: avoid counting waste/rejects twice in Redzone.
- Draft v1.2 included 'New blank sheet', a new local-storage key ('greencore-sic-paper-v12'), no migration of old saved data, service-worker unregister attempt, nine initial blank rows and visible version label.
- A downloadable HTML draft was prepared, but deployment to the live repository was not verified.

## 15–16 November 2026 — GitHub connection
- Repository: h20apple/SIC-WORK-; GitHub Pages site: https://h20apple.github.io/SIC-WORK-/.
- GitHub connector could fetch the existing index.html, but initial attempts to write failed with 403 'Resource not accessible by integration'.
- Connection settings and GitHub repository permissions were reviewed on iPhone/Safari.
- **16 November:** Successfully created branch 'chatgpt-permission-test-20261116-b' from main. This verified branch creation permission, not yet successful replacement of index.html.
- **16 November:** Added this history file as project documentation, without changing the live application's index.html.

## Outstanding verification / next work
1. Test updating a harmless file through GitHub and confirm write permissions.
2. Compare live index.html against the latest v1.2 draft before changing the app.
3. Verify nine initial rows, product autofill, '=' continuation, OC vs non-OC calculations and no Redzone double-counting.
4. Test A4 landscape printing and iPhone Safari display.
5. Validate Final Product Sheet fields, permissions, A4 layout and any eventual multi-user backend.
6. Maintain this file and a changelog as new updates are committed.

## Known limitations
- This is a reconstruction from project discussions and confirmed actions, not an exhaustive commit-by-commit Git history.
- Requested features and prepared prototypes are distinguished from verified live behavior.
