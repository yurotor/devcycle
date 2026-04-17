# Analysis Transcript — CLN-2935: Add "mpl_id" to the error log for batches that fail due to 'Insufficient funds accounts'

*Generated: 2026-04-15T13:24:25.001Z*

---

**User**:

Here's the ticket: "Add "mpl_id" to the error log for batches that fail due to 'Insufficient funds accounts'". Add "mpl_id" to the error log for batches that fail due to 'Insufficient funds accounts'. Currently, the error log does not include the "mpl_id", which is necessary for better tracking and debugging.

---

**AI Analyst**:

Now I have complete understanding. Current state:
- **Account-level logging** (line 89 in PurchaseLoans.fs): Already includes mpl_id via structured logging
- **Batch failure reason** (line 159 in PurchaseLoans.fs): Only includes account numbers, NO mpl_id
- **Batch entity**: Has MplId field (line 12 in Batch.cs)
- **Batches are per-MPL**: PurchaseLoansRequest has mplId (line 21), LoanForPurchase has mplId (line 42)
- **updateBatch function**: Already extracts and logs mpl_id when batch fails (DataProvider.fs)

The issue: When `checkAccounts` returns an error with "Insufficient funds accounts: ACC1,ACC2", this message is passed to `updateBatch` which logs it with mpl_id BUT the Reason field stored in the Batch table doesn't include mpl_id.

Should we add mpl_id to the batch failure reason string itself (stored in DB), or rely on existing structured logging + batch.MplId field?

**Recommendation**: Add mpl_id to the error message string for immediate visibility in logs/UI, since the Reason field is likely displayed directly to users.

---

**User**:

Add mpl_id to the error message string (e.g., 'MPL_ID: MARLETTE - Insufficient funds accounts: ACC1,ACC2')

---

**AI Analyst**:

Good. mpl_id goes in error message.

Now need format decision. Current error message:
```
"Insufficient funds accounts: {accounts}"
```

Test in PurchaseLoansTests.fs line 737 checks `reason.StartsWith("Insufficient funds accounts:")` - breaks if add prefix.

Format options:
1. `"Insufficient funds accounts: {accounts} (MPL: {mplId})"` - suffix, keeps test working
2. `"MPL {mplId} - Insufficient funds accounts: {accounts}"` - prefix, must update test
3. `"Insufficient funds accounts for MPL {mplId}: {accounts}"` - middle insertion

Recommend option 1 - suffix format preserves existing test logic, adds context where humans read.

---

**User**:

Suffix format: 'Insufficient funds accounts: ACC1,ACC2 (MPL: MARLETTE)'

---

**AI Analyst**:

Suffix format chosen. Preserves test.

One more check: matured loan path (PurchaseLoans.fs line 294) uses `"UNKNOWN"` for mplId in `checkAccounts` call. Matured loans processed individually, not in batches.

Question: Should matured loan failures also get mplId in error message? Currently no batch context there - loan processed alone, error goes to log only (no batch Reason field).

Scope options:
1. Fix batch purchase path only (main ticket scope)
2. Fix both batch + matured loan paths (complete coverage)

Recommend option 1 - ticket specifically about "batches that fail", matured loans = separate flow.

---

**User**:

Batch purchase only (ticket scope)

---

**AI Analyst**:

All decisions made. Summary:

**Changes needed:**
1. Modify `checkAccounts` function in PurchaseLoans.fs line 159
2. Change error message from:
   ```fsharp
   $"Insufficient funds accounts: {String.Join(',', insufficientFundsAccounts)}"
   ```
   To:
   ```fsharp
   $"Insufficient funds accounts: {String.Join(',', insufficientFundsAccounts)} (MPL: {mplId})"
   ```

**Scope:**
- Batch purchase flow only (createTransfers path)
- mplId already passed to checkAccounts (line 227)
- Matured loans excluded (separate ticket if needed)

**Test impact:**
- PurchaseLoansTests.fs line 737 uses `StartsWith("Insufficient funds accounts:")` - still works with suffix
- InsufficientFundsLoggingTests.fs line 115 checks `contain "Insufficient funds accounts"` - still works



Ready to implement?