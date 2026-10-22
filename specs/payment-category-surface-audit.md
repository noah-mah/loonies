# Payment category surface audit

Where credit/debt **payment categories** (`accounts.payment_category`) are still
treated as ordinary expense categories.

**Status:** Critical/High items C1–C2 and H1–H5 from the recommended fix order
are implemented on this branch. Remaining: budgeted-mode report exclusions (H6)
and medium polish (M3–M5 pickers / report defaults).

Payment leftover means **available for payment**
(`budgeted + covered − payments + previous`), not unspent grocery money. Almost
every other surface still assumes `!is_income` ⇒ normal envelope.

## Already correct

| Area                                     | Location                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Payment leftover / coverage math         | `packages/loot-core/src/server/budget/payment.ts` (`isPaymentCategory`, `listExpenseCategoryIds`)                               |
| Envelope install path                    | `packages/loot-core/src/server/budget/envelope.ts`                                                                              |
| Forced sheet carryover                   | `packages/loot-core/src/server/budget/base.ts`                                                                                  |
| Desktop envelope rows                    | `EnvelopeBudgetComponents.tsx` — debt balance, “Available for payment”, hide schedule indicator                                 |
| Desktop debt group headers               | `ExpenseGroup.tsx` when every category in the group is a payment category                                                       |
| Client id set                            | `usePaymentCategoryIds.ts` (desktop budget only today)                                                                          |
| Net worth / cash-flow / calendar reports | Account- or amount-sign based; payment category ids usually unused                                                              |
| Overspent banner (today)                 | `useOverspentCategories` skips carryover cats; payment sheet carryover is forced true — **accidental**, not an explicit exclude |

## Finding summary

| Severity   | Count   | Theme                                                                            |
| ---------- | ------- | -------------------------------------------------------------------------------- |
| Critical   | 2       | Cleanup can drain / auto-fund payment leftovers; public API mislabels them       |
| High       | 6       | Mobile wrong column; templates; transfer/cover; delete; budgeted reports         |
| Medium     | 6       | Bulk avg/zero; automation UI; rules pickers; spending budget line; API carryover |
| Low / info | several | Labels, hide/move, importers, latent tx-based reports                            |

---

## Critical

### C1 — End-of-month cleanup drains available-for-payment

**Where:** `packages/loot-core/src/server/budget/cleanup-template.ts`

**What:** Global/group **source** roles move `leftover-*` back to To Budget / a
pool for every expense category with a cleanup definition. The underfunded loop
(~246–284) auto-budgets any `!is_income` category with `leftover < 0` when DB
`zero_budgets.carryover === 0` (null treated as 0).

**Why it breaks:** Payment leftover is the card’s payment reserve. “Send
leftover” strips funded purchases into To Budget. Negative leftover after an
overpayment is not overspending; DB carryover is often unset even though the
**sheet** carryover is forced true, so cleanup can auto-assign To Budget into
the payment row.

**Fix direction:** Skip `isPaymentCategory` in source/sink/underfunded loops;
block cleanup automations on payment categories in the UI.

### C2 — Public API cannot see payment links and mislabels balances

**Where:**

- `packages/loot-core/src/server/api.ts` → `api/budget-month`
- `packages/loot-core/src/server/api-models.ts` → `APIAccountEntity` (no
  `payment_category`)
- `packages/api/methods.ts` wrappers

**What:** Expense categories expose `spent: sum-amount-*` and
`balance: leftover-*`. Accounts returned to API clients omit `payment_category`.

**Why it breaks:** Payment `spent` is usually ~0 (real activity is `covered` /
`payments`, not exposed). `balance` is available-for-payment, labeled like
expense leftover. Integrations cannot filter payment categories at all.

**Fix direction:** Expose `payment_category` on accounts (and/or a payment flag
on categories); document or remap payment fields (`availableForPayment`,
`debtBalance`) in `getBudgetMonth`.

---

## High

### H1 — Mobile budget shows activity instead of debt balance

**Where:**

- `packages/desktop-client/src/components/mobile/budget/ExpenseCategoryListItem.tsx`
- `packages/desktop-client/src/components/mobile/budget/ExpenseGroupListItem.tsx`
- `SpentCell.tsx`

**What:** Always binds `catSumAmount` / `groupSumAmount`. No
`usePaymentCategoryIds`. Schedule indicators always shown; spent tap always
opens category activity.

**Why it breaks:** Desktop uses `catDebtBalance` / `groupDebtBalance` for
payment rows and hides schedule / spent navigation. Mobile “Spent” is ~0 while
the card balance is elsewhere.

**Fix direction:** Mirror desktop payment/debt bindings and interaction rules.

### H2 — Goal / schedule / limit templates run on payment categories

**Where:**

- `packages/loot-core/src/server/budget/goal-template.ts` (`computeTemplates`
  keeps all non-income cats)
- `category-template-context.ts`, `schedule-template.ts`
- Desktop automation button / “Overwrite with templates” on groups

**What:** Automations treat payment leftover as normal category balance.
Limit-excess can reduce budget and pull “surplus” available-for-payment into To
Budget. Schedule templates budget against the wrong activity.

**Fix direction:** Exclude payment categories from `computeTemplates`; hide or
disable automations on payment rows / debt groups.

### H3 — Transfer / cover pickers include payment categories

**Where:** Desktop `CoverMenu` / `TransferMenu`; mobile `CoverModal` /
`TransferModal`; server `coverOverspending` / `transferCategory` /
`coverOverbudgeted` / `transferAvailable` (no guard).

**Why it breaks:** Moving money from a payment row drains available-for-payment
as if it were a spending envelope. Covering “overspending” into a payment row
misuses negative leftover after overpayment.

**Fix direction:** Filter payment ids out of pickers (or allow only as an
explicit destination with payment-specific copy); optionally reject on the
server.

### H4 — Balance menu actions on payment rows

**Where:** Shared `BalanceMenu` / `useBalanceMenu`;
`EnvelopeBalanceMenuModal`; desktop and mobile balance cells.

**What:** Transfer, cover, and carryover toggles are offered; label is always
“Balance”.

**Why it breaks:** Semantics are “Available for payment”. Carryover toggle
fights sheet-forced carryover and unlocks the fragile overspent/cleanup paths.

**Fix direction:** Payment-specific menu (or disable transfer/cover/carryover);
label “Available for payment”.

### H5 — Category delete / merge does not unlink payment tracking

**Where:** `budget/app.ts` `deleteCategory`; confirm-delete modals;
`MobileSheetCategoryPicker` transfer targets.

**What:** No check that the category is an account’s `payment_category`; no
`uninstallPaymentCategory`; transfer-on-delete can dump history into (or out of)
a payment category.

**Why it breaks:** Dangling `accounts.payment_category` pointers; broken sheet
cells; polluted coverage.

**Fix direction:** Refuse delete while linked, or clear the account link and
uninstall payment cells first; exclude payment cats from transfer-on-delete
targets.

### H6 — Budgeted-mode reports treat payment budgets as expense sinks

**Where:**

- `budget-analysis-spreadsheet.ts`
- `budgetDataQuery.ts` / custom & grouped Budgeted mode
- `sankey-spreadsheet.ts` budgeted path (via `api/budget-month`)

**Why it breaks:** Payment `budget-*` and `leftover-*` inflate “expense
budgeted” and carryover-style rollups. Tx-based spent modes are usually fine
(payment cats have little `sum-amount`).

**Fix direction:** Exclude payment category ids (once detectable via API or
shared helper) from budgeted expense aggregates; optionally show them in a
separate “Payments” series later.

---

## Medium

| ID  | Area                                            | Issue                                                                   |
| --- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| M1  | `budget/actions.ts` `setNMonthAvg` / `setZero`  | Averages `sum-amount` (~0) or zeros payment budgets                     |
| M2  | Automation UI on payment rows                   | Users can attach cleanup/templates that hit C1/H2                       |
| M3  | Rules / transaction / schedule category pickers | Can categorize purchases onto payment cats; those amounts skip coverage |
| M4  | Spending report budget comparison line          | Sums all budget rows including payment assignments                      |
| M5  | Crossover / sankey spent defaults               | Payment ids in expense sets (usually 0 impact)                          |
| M6  | `api` `validateExpenseCategory` / set carryover | Treats payment cats as normal expenses                                  |

---

## Low / by design / OK

| Area                                                  | Note                                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------ |
| `total-budgeted` including payment budgets            | By design for To Budget math                                             |
| Cash flow, calendar, summary, age-of-money, net worth | Little or no payment-category dependency                                 |
| Export / backup                                       | DB keeps `payment_category`; CSV has no special marker                   |
| YNAB import                                           | Imported “CC Payment” cats stay normal until account tracking is enabled |
| Tracking budget                                       | No payment install path (envelope-only feature)                          |

---

## Recommended fix order

1. **C1** — Exclude payment categories from cleanup (money safety).
2. **H5** — Safe delete / unlink (data integrity).
3. **H2** — Block templates/automations on payment cats.
4. **H3 + H4** — Transfer/cover/balance menu (shared desktop + mobile).
5. **H1** — Mobile debt column parity with desktop.
6. **C2 + H6** — API discoverability + budgeted reports.
7. **M1–M6** — Bulk actions, pickers, polish.

Shared helper recommendation: export `isPaymentCategory` / id set from loot-core
to the client (or keep `usePaymentCategoryIds`) and use one filter everywhere
today’s loops say `!is_income`.

## Out of scope for this audit

- Implementing any of the fixes above
- Paper chrome restyle, income-by-payee, or filter chips
  (`specs/budget-category-filters.md` is separate)
- Changing payment leftover math itself
