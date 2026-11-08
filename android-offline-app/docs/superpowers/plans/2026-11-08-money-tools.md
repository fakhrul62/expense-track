# Money tools implementation plan

Goal: Bank Balance in Add Money, readable font choices in Config, separate monthly report/chart, installment collection and mistaken-loan deletion.

Architecture: Preserve the shared positive-amount ledger, reserved income IDs, direction envelope, local SQLite/IndexedDB and outbox. Reports derive cash-basis totals from existing transactions (skip future/existing-debt entries), not a second balance. New Bank Balance is an opening-money source. Fonts are bundled Arimo/Carlito plus existing Inter/Space Mono and system; no proprietary fonts copied. Loan deletion removes principal and all linked payments atomically and queues their tombstones.

- [x] Add Bank Balance with stable income identity and seed any new default even on existing initialized stores.
- [x] Add device-local font preference and matching font previews, using Inter by default with Retro available.
- [x] Add /reports with month controls, income/expense/net, starting/ending cash, accessible daily chart and category breakdown; link from header and Config.
- [x] Clarify installment collection. Add confirmed deletion of entire loan/payment history and atomic browser/native delete with account guard.
- [x] Verify funds, reporting calculations, fonts persistence, installments, deletion with payments, cancellation, offline/sync behavior and native storage. Build/install local Android preview. No push requested.

Deletion semantics: Only explicit loan deletion reverses its ledger effects; it removes its linked payment history too. The dialog states this before confirmation. Does not delete a category or unrelated expenses. Existing loan cash-only switch remains separate from direction choices.
