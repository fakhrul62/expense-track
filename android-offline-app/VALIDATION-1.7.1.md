# EXPTRACK 1.7.1 - Safe popup header and stacked expenses

Android versionCode 14. Phone expense popups reserve a minimum 24px top gap, expanding to the reported display safe area plus a 12px buffer. The dialog fills the remaining space; Add Another and Close remain in a fixed header and Save all remains in the fixed footer. The form body scrolls independently while the keyboard is open.

Each added draft is a separate vertically stacked, editable expense card below the prior one, with a remove button. Compact category choices, per-entry dates/notes, total, batch limit and atomic persistence are preserved. There is no hidden review toggle. Browser financial/edit/remove/cancel/rollback checks passed. Build, signature/alignment, and native checks use the existing scripts; the batch check now verifies top spacing and vertical card geometry.

Native batch checks passed on the API 35 emulator with the tall display-cutout overlay enabled, including top gap/header action placement, non-overlapping stacked cards, mixed fields, totals, edit/remove, reload and rollback. The notch overlay was restored to its previous disabled state after testing. Release/debug builds and signature/alignment verification passed.
