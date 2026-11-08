# Loan directions implementation plan

Goal: Add I Owe / Owed to Me tabs inside Add Loan, plus an Owed to Me filter beside Active and Cleared.

Design: Keep the existing loan ledger envelope and add optional direction (borrowed/lent), defaulting old records to borrowed. Borrowed cash adds money and repayment deducts it. Lent cash deducts money and collection adds it. Existing debt entries affect only outstanding balances. Active lists outstanding borrowing, Owed to Me lists outstanding lending, Cleared/All include both with direction labels. Totals follow each selected direction, and mixed lists show the two outstanding totals separately without netting debt against receivables.

Implementation:
- [x] Add a backward-compatible direction parser and loan summary filtering. Test old records and both cash directions.
- [x] Extend local loan/repayment saving using existing atomic record/outbox writes, reserved lending category and existing income category for returned money.
- [x] Add accessible two-button direction choice in Add Loan, clear person/action labels and main filters.
- [x] Verify borrowing/lending, partial/full settlement, reload, legacy data, cash balances, offline sync and mobile light/dark layouts.
- [x] Build/install updated Android preview and inspect it. Keep changes local; no push requested.

Scope: Existing account-isolated IndexedDB/SQLite and cloud protocol stay in use. No destructive migration or deletion. Main Active filter retains borrowed-loan behavior. Implementation and review performed inline.

Verification: browser and native SQLite direction tests passed with isolated accounts. Browser offline lending restored correctly in a separate simulated-sync client. Final APK rebuild includes selecting the matching main filter after adding a new loan. A local PowerShell Get-FileHash discovery failure was replaced by a direct .NET SHA256 helper to keep signing/copy/descriptor validation reliable.
