# Budget category filter chips — matching rules

Product decision for the Paper budget restyle. **Implement filters only after this
file is accepted.** The Paper mock shows chips for Overspent, Underfunded,
Overfunded, and Available; it never defined what Underfunded / Overfunded match.

This document is the source of truth for those match rules. It is intentionally
narrow: matching math and chip behavior only — not sidebar layout, month strip,
or account overlays.

## Goals

- Make Underfunded / Overfunded mean the same thing as the existing goal status
  in the category balance menu (`GoalStatus`), so users are not taught two
  funding models.
- Reuse spreadsheet cells Actual already computes (`leftover`, `budget`,
  `goal`, `long-goal`, `carryover`).
- Keep payment-category (credit/debt) rows consistent with spending rows where
  the same cells exist, and call out the one intentional exception.

## Non-goals

- Building the filter UI (this is definition only).
- Changing how goals / automations / payment reserves are calculated.
- Defining YNAB’s Auto-Assign “Underfunded” button (assign money until targets
  are met). That is a separate assign action, not a row filter.

## Scope of a filter pass

| Dimension             | Rule                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Month                 | The **currently viewed** budget month only                                                                                |
| Budget type           | Envelope budget (Paper target). Tracking budget may reuse the same predicates later; do not block envelope work on it     |
| Categories considered | Non-income, non-hidden categories whose group is also not hidden                                                          |
| Payment categories    | Included, except where noted under Overspent                                                                              |
| Default chip          | **All** (no filter) — every eligible category row is visible                                                              |
| Chip selection        | **Single-select** among All / Overspent / Underfunded / Overfunded / Available. Activating one chip replaces the previous |

When a chip is active, hide non-matching category rows. Hide a group if it has
no visible categories after filtering. Show an empty state if nothing matches.

## Shared inputs (per category, viewed month)

All amounts are integer cents from the month sheet.

| Symbol      | Sheet / meaning                                                                               |
| ----------- | --------------------------------------------------------------------------------------------- |
| `balance`   | `leftover-{id}` — Available / leftover for the category (payment rows: available for payment) |
| `budgeted`  | `budget-{id}`                                                                                 |
| `goal`      | `goal-{id}` — null / missing means **no target**                                              |
| `longGoal`  | `long-goal-{id}` — `1` = long-term goal; otherwise monthly automation target                  |
| `carryover` | `carryover-{id}` — rollover enabled                                                           |
| `have`      | `longGoal === 1 ? balance : budgeted` — same as `GoalStatus`                                  |

A category **has a target** when `goal` is a finite number (including `0`).
Categories without a target never match Underfunded or Overfunded.

`goalTemplatesEnabled` does not change the predicates. If goals are never
written, those two chips simply match nothing.

## Chip predicates

### Overspent

Matches when **all** of:

1. `balance < 0`
2. `carryover` is false
3. The category is **not** a payment category (`accounts.payment_category` does
   not point at this category)

Rationale: this is exactly what `useOverspentCategories` already uses for the
mobile overspent banner. Payment rows can show a negative leftover after an
intentional overpayment; that is “paid ahead,” not overspending, so they are
excluded here.

### Underfunded

Matches when **all** of:

1. The category has a target
2. `have < goal`

Diff shown in UI copy (optional): `have - goal` (negative).

### Overfunded

Matches when **all** of:

1. The category has a target
2. `have > goal`

Diff shown in UI copy (optional): `have - goal` (positive).

### Fully funded (not a chip)

`have === goal` with a target. These rows appear under **All**, and under
**Available** only if `balance > 0`. There is no Fully funded chip in the Paper
mock; do not add one unless design revisits.

### Available

Matches when **all** of:

1. `balance > 0`
2. Category is eligible (non-income, visible)

Includes payment categories with money ready to pay the card/loan. Does **not**
require a goal.

## Overlap and exclusivity

Predicates are **not** mutually exclusive at the data level:

| Example                               | Overspent | Underfunded              | Overfunded | Available |
| ------------------------------------- | --------- | ------------------------ | ---------- | --------- |
| Spent past leftover, no goal          | ✓         |                          |            |           |
| Goal $100, budgeted $40, balance $40  |           | ✓                        |            | ✓         |
| Goal $100, budgeted $150, balance $20 |           |                          | ✓          | ✓         |
| Long-term goal $500, balance $600     |           |                          | ✓          | ✓         |
| Payment row leftover −$25 (overpay)   |           | _if goal & have&lt;goal_ |            |           |

Because chips are single-select, a row that would match two predicates only
appears when the active chip’s predicate is true. Implementers should still
evaluate predicates independently (do not bake chip exclusivity into the
math).

## Worked examples

Amounts in dollars for readability.

### 1. Monthly automation underfunded

- Goal (monthly): $200 · Budgeted: $50 · Balance: $50 · `longGoal ≠ 1`
- `have = 50` → **Underfunded** (−150) · **Available** (balance &gt; 0)

### 2. Long-term goal overfunded

- Goal (long-term): $1,000 · Budgeted: $100 · Balance: $1,200 · `longGoal = 1`
- `have = 1,200` → **Overfunded** (+200) · **Available**

### 3. Overspent spending category

- No goal · Balance: −$35 · Carryover off
- → **Overspent** only

### 4. Overspent with rollover

- Balance: −$35 · Carryover on
- → matches **no** chip (same as today’s overspent banner)

### 5. Credit payment category after funded spend

- Payment leftover (available for payment): $80 · No goal
- → **Available** only

### 6. Credit payment category after overpayment

- Payment leftover: −$25 · No goal
- → matches **no** chip (not Overspent; not Available)

### 7. No goals in the budget

- Underfunded and Overfunded match sets are empty; chips may still render.

## Alternatives considered

| Approach                                                                    | Why rejected                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Underfunded = `balance < budgeted` with no goal                             | Confuses spending pace with funding a plan; Paper said a target is required     |
| Mirror YNAB Auto-Assign Underfunded (schedules + targets + CC payoff order) | That is an assign action, not a filter; schedules are out of scope for v1 chips |
| Treat negative payment leftover as Overspent                                | Conflicts with intentional overpayment carry-forward already in `payment.ts`    |
| Multi-select chips                                                          | Paper reads as a simple focus bar; single-select is enough for v1               |

## Implementation notes (for a later PR)

- Prefer a shared helper (e.g. `getCategoryFilterState`) used by desktop filter
  chips and any mobile equivalent, rather than forking `GoalStatus` math.
- Reuse or thin-wrap `useOverspentCategories` for the Overspent chip.
- Payment-category detection: invert the existing payment-link list (category
  id appears as some account’s `payment_category`).
- No release note until the chips ship in the UI.

## Open questions (do not block the predicates above)

1. Should Underfunded / Overfunded chips be **hidden** when `goalTemplatesEnabled`
   is off, or shown but empty? Recommendation: **show but empty** so the Paper
   chrome stays stable; revisit if it feels noisy.
2. Tracking budget: apply the same predicates when that surface gets the chip
   bar, or envelope-only forever?
3. Future: a dedicated assign action analogous to YNAB Underfunded — separate
   spec; must not redefine these filter predicates.
