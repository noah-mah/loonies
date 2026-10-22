import * as db from '#server/db';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import * as monthUtils from '#shared/months';
import { safeNumber } from '#shared/util';

import { number, sumAmounts } from './util';

type Month = string;

type PaymentLink = {
  id: string;
  payment_category: string;
};

type CardActivity = {
  category: string;
  month: number;
  purchases: number | null;
  refunds: number | null;
};

type MonthAmount = {
  month: number;
  amount: number | null;
};

// Positive amounts categorized to a spending category are refunds. They are
// kept out of that category's balance and sent to the card or to To Budget.
export const excludedExpenseRefundSql = `
  AND NOT (
    IFNULL(c.is_income, 0) = 0
    AND t.amount > 0
    AND t.transfer_id IS NULL
    AND IFNULL(t.starting_balance_flag, 0) = 0
    AND IFNULL(t.is_parent, 0) = 0
  )
`;

type AmountRow = {
  amount: number | null;
};

// Money set aside for a linked account:
// budgeted + covered card spending + last month's available − payments.
export function createPaymentCategory(
  categoryId: string,
  accountId: string,
  sheetName: string,
  prevSheetName: string,
): void {
  createBudgetCell(categoryId, sheetName);
  sheet.get().createStatic(sheetName, `carryover-${categoryId}`, true);
  createPaymentDynamicCells(categoryId, accountId, sheetName, prevSheetName);
  sheet.get().set(`${sheetName}!carryover-${categoryId}`, true);
}

export function createExpenseCategory(
  categoryId: string,
  sheetName: string,
  prevSheetName: string,
): void {
  createBudgetCell(categoryId, sheetName);
  sheet.get().createStatic(sheetName, `carryover-${categoryId}`, false);
  createExpenseLeftover(categoryId, sheetName, prevSheetName);
}

export function createGroupDebtBalance(
  group: { id: string; categories: Array<{ id: string }> },
  sheetName: string,
): void {
  const paymentIds = new Set(listPaymentCategoryIds());
  const dependencies = group.categories
    .filter(category => paymentIds.has(category.id))
    .map(category => `debt-balance-${category.id}`);

  sheet.get().createDynamic(sheetName, `group-debt-balance-${group.id}`, {
    initialValue: 0,
    dependencies,
    run: sumAmounts,
  });
}

export function installPaymentCategory(
  categoryId: string,
  accountId: string,
  months: Iterable<Month>,
): void {
  for (const month of months) {
    const sheetName = monthUtils.sheetForMonth(month);
    const budgetCell = resolveName(sheetName, `budget-${categoryId}`);
    const coveredCell = resolveName(sheetName, `covered-${categoryId}`);
    if (!sheet.get().hasCell(budgetCell) || sheet.get().hasCell(coveredCell)) {
      continue;
    }

    const prevSheetName = monthUtils.sheetForMonth(monthUtils.prevMonth(month));
    sheet.get().deleteCell(sheetName, `leftover-${categoryId}`);
    createPaymentDynamicCells(categoryId, accountId, sheetName, prevSheetName);
    sheet.get().set(`${sheetName}!carryover-${categoryId}`, true);
    ensureGroupDebtBalance(categoryId, sheetName);
  }
}

export function uninstallPaymentCategory(
  categoryId: string,
  months: Iterable<Month>,
): void {
  for (const month of months) {
    const sheetName = monthUtils.sheetForMonth(month);
    const coveredCell = resolveName(sheetName, `covered-${categoryId}`);
    if (!sheet.get().hasCell(coveredCell)) {
      continue;
    }

    const prevSheetName = monthUtils.sheetForMonth(monthUtils.prevMonth(month));
    sheet.get().deleteCell(sheetName, `covered-${categoryId}`);
    sheet.get().deleteCell(sheetName, `payments-${categoryId}`);
    sheet.get().deleteCell(sheetName, `debt-balance-${categoryId}`);
    sheet.get().deleteCell(sheetName, `leftover-${categoryId}`);
    createExpenseLeftover(categoryId, sheetName, prevSheetName);
    removeGroupDebtBalance(categoryId, sheetName);
  }
}

export function ensurePaymentCategories(months: Iterable<Month>): void {
  for (const link of listPaymentLinks()) {
    installPaymentCategory(link.payment_category, link.id, months);
  }
}

export function isPaymentCategory(categoryId: string): boolean {
  return getLinkedAccountId(categoryId) != null;
}

const pendingDebtBalanceRefreshes: string[] = [];

export function noteDebtBalanceRefresh(categoryId: string): void {
  pendingDebtBalanceRefreshes.push(categoryId);
}

// The balance cell is created in the same spreadsheet pass as the account
// link. Running it again afterwards picks up the starting balance, which is
// written in that same change.
export function flushDebtBalanceRefreshes(): void {
  const categoryIds = pendingDebtBalanceRefreshes.splice(0);
  const createdMonths = sheet.get().meta().createdMonths;
  if (!createdMonths) {
    return;
  }

  for (const categoryId of categoryIds) {
    for (const month of createdMonths) {
      const sheetName = monthUtils.sheetForMonth(month);
      const name = resolveName(sheetName, `debt-balance-${categoryId}`);
      if (sheet.get().hasCell(name)) {
        sheet.get().recompute(name);
      }
    }
  }
}

export function recomputePaymentCellsForTransaction(transaction: {
  acct?: string | null;
  date?: number | null;
}): void {
  if (!transaction.acct || transaction.date == null) {
    return;
  }

  const categoryId = getPaymentCategoryForAccount(transaction.acct);
  if (!categoryId) {
    return;
  }

  const month = monthUtils.monthFromDate(db.fromDateRepr(transaction.date));
  recomputePaymentCategoryFrom(categoryId, month);
}

// A budget or card transaction can change how much of an earlier purchase was
// funded, which changes whether a later refund still has money to move back.
export function recomputeLaterCoverage(fromMonth: string): void {
  for (const categoryId of listPaymentCategoryIds()) {
    recomputePaymentCategoryFrom(categoryId, fromMonth, { coveredOnly: true });
  }
}

function recomputePaymentCategoryFrom(
  categoryId: string,
  fromMonth: string,
  options: { coveredOnly?: boolean } = {},
): void {
  const createdMonths = sheet.get().meta().createdMonths;
  if (!createdMonths) {
    return;
  }

  // This month and every later month show the live balance, so a transaction
  // in any of them has to refresh all of them. A past month stops at its end.
  const months = new Set<string>();
  for (const createdMonth of createdMonths) {
    if (createdMonth >= fromMonth) {
      months.add(createdMonth);
    }
  }
  if (!options.coveredOnly) {
    const current = monthUtils.currentMonth();
    for (const createdMonth of createdMonths) {
      if (createdMonth >= current) {
        months.add(createdMonth);
      }
    }
  }

  for (const createdMonth of months) {
    const sheetName = monthUtils.sheetForMonth(createdMonth);
    const spreadsheet = sheet.get();
    const cells = options.coveredOnly
      ? [`covered-${categoryId}`]
      : [
          `covered-${categoryId}`,
          `payments-${categoryId}`,
          `debt-balance-${categoryId}`,
        ];
    for (const cell of cells) {
      const name = resolveName(sheetName, cell);
      if (spreadsheet.hasCell(name)) {
        spreadsheet.recompute(name);
      }
    }
  }
}

export function watchCategoryForCoverage(
  categoryId: string,
  months: Iterable<Month>,
): void {
  if (isPaymentCategory(categoryId) || !isExpenseCategory(categoryId)) {
    return;
  }

  for (const paymentCategoryId of listPaymentCategoryIds()) {
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      const covered = `covered-${paymentCategoryId}`;
      if (!sheet.get().hasCell(resolveName(sheetName, covered))) {
        continue;
      }
      const prevSheetName = monthUtils.sheetForMonth(
        monthUtils.prevMonth(month),
      );
      sheet
        .get()
        .addDependencies(
          sheetName,
          covered,
          coverageDependencyNames(sheetName, prevSheetName, categoryId),
        );
    }
  }
}

export function unwatchCategoryForCoverage(
  categoryId: string,
  months: Iterable<Month>,
): void {
  for (const paymentCategoryId of listPaymentCategoryIds()) {
    for (const month of months) {
      const sheetName = monthUtils.sheetForMonth(month);
      const covered = `covered-${paymentCategoryId}`;
      if (!sheet.get().hasCell(resolveName(sheetName, covered))) {
        continue;
      }
      const prevSheetName = monthUtils.sheetForMonth(
        monthUtils.prevMonth(month),
      );
      sheet
        .get()
        .removeDependencies(
          sheetName,
          covered,
          coverageDependencyNames(sheetName, prevSheetName, categoryId),
        );
    }
  }
}

function createBudgetCell(categoryId: string, sheetName: string): void {
  sheet.get().createStatic(sheetName, `budget-${categoryId}`, 0);
  if (sheet.get().getCellValue(sheetName, `budget-${categoryId}`) == null) {
    sheet.get().set(resolveName(sheetName, `budget-${categoryId}`), 0);
  }
}

function createExpenseLeftover(
  categoryId: string,
  sheetName: string,
  prevSheetName: string,
): void {
  sheet.get().createDynamic(sheetName, `leftover-${categoryId}`, {
    initialValue: 0,
    dependencies: [
      `budget-${categoryId}`,
      `sum-amount-${categoryId}`,
      `${prevSheetName}!carryover-${categoryId}`,
      `${prevSheetName}!leftover-${categoryId}`,
      `${prevSheetName}!leftover-pos-${categoryId}`,
    ],
    run: (
      budgeted: unknown,
      spent: unknown,
      prevCarryover: unknown,
      prevLeftover: unknown,
      prevLeftoverPos: unknown,
    ) => {
      const carried = prevCarryover
        ? number(prevLeftover)
        : number(prevLeftoverPos);
      return safeNumber(number(budgeted) + number(spent) + carried);
    },
  });

  sheet.get().createDynamic(sheetName, `leftover-pos-${categoryId}`, {
    initialValue: 0,
    dependencies: [`leftover-${categoryId}`],
    run: (leftover: unknown) => {
      return number(leftover) < 0 ? 0 : number(leftover);
    },
  });
}

function createPaymentDynamicCells(
  categoryId: string,
  accountId: string,
  sheetName: string,
  prevSheetName: string,
): void {
  const { start, end } = boundsForSheet(sheetName);
  const expenseCategoryIds = listExpenseCategoryIds();
  const coveredDependencies = expenseCategoryIds.flatMap(expenseCategoryId =>
    coverageDependencyNames(sheetName, prevSheetName, expenseCategoryId),
  );

  sheet.get().createDynamic(sheetName, `covered-${categoryId}`, {
    initialValue: 0,
    dependencies: coveredDependencies,
    run: () => coveredActivity(accountId, sheetName, prevSheetName, start, end),
  });

  sheet.get().createDynamic(sheetName, `payments-${categoryId}`, {
    initialValue: 0,
    run: () => transferPayments(accountId, start, end),
  });

  sheet.get().createDynamic(sheetName, `debt-balance-${categoryId}`, {
    initialValue: 0,
    run: () => accountBalance(accountId, sheetName),
  });

  sheet.get().createDynamic(sheetName, `leftover-${categoryId}`, {
    initialValue: 0,
    dependencies: [
      `budget-${categoryId}`,
      `covered-${categoryId}`,
      `payments-${categoryId}`,
      `${prevSheetName}!leftover-${categoryId}`,
    ],
    run: (
      budgeted: unknown,
      covered: unknown,
      payments: unknown,
      prevLeftover: unknown,
    ) => {
      return safeNumber(
        number(budgeted) +
          number(covered) -
          number(payments) +
          number(prevLeftover),
      );
    },
  });

  sheet.get().createDynamic(sheetName, `leftover-pos-${categoryId}`, {
    initialValue: 0,
    dependencies: [`leftover-${categoryId}`],
    run: (leftover: unknown) => {
      return number(leftover) < 0 ? 0 : number(leftover);
    },
  });
}

function boundsForSheet(sheetName: string): { start: number; end: number } {
  const month = `${sheetName.slice('budget'.length, 'budget'.length + 4)}-${sheetName.slice('budget'.length + 4)}`;
  return monthUtils.bounds(month);
}

function coveredActivity(
  accountId: string,
  sheetName: string,
  _prevSheetName: string,
  _start: number,
  end: number,
): number {
  const paymentIds = new Set(listPaymentCategoryIds());
  const currentMonth = yyyymmFromSheet(sheetName);
  const activity = db.runQuery<CardActivity>(
    `SELECT t.category AS category,
            t.date / 100 AS month,
            SUM(CASE WHEN t.amount < 0 THEN t.amount ELSE 0 END) AS purchases,
            SUM(
              CASE
                WHEN t.amount > 0
                 AND t.transfer_id IS NULL
                 AND IFNULL(t.starting_balance_flag, 0) = 0
                 AND IFNULL(c.is_income, 0) = 0
                THEN t.amount
                ELSE 0
              END
            ) AS refunds
       FROM v_transactions_internal_alive t
       LEFT JOIN categories c ON c.id = t.category
      WHERE t.date <= ?
        AND t.account = ?
        AND t.category IS NOT NULL
        AND IFNULL(t.is_parent, 0) = 0
      GROUP BY t.category, t.date / 100`,
    [end, accountId],
    true,
  );
  const paymentRows = db.runQuery<MonthAmount>(
    `SELECT date / 100 AS month, SUM(amount) AS amount
       FROM v_transactions_internal_alive
      WHERE date <= ?
        AND account = ?
        AND transfer_id IS NOT NULL
        AND amount > 0
        AND IFNULL(is_parent, 0) = 0
      GROUP BY date / 100`,
    [end, accountId],
    true,
  );

  const purchasesByMonth = new Map<number, Map<string, number>>();
  const refundsByMonth = new Map<number, number>();
  for (const row of activity) {
    if (paymentIds.has(row.category)) {
      continue;
    }
    const purchases = row.purchases || 0;
    if (purchases < 0) {
      const categories =
        purchasesByMonth.get(row.month) ?? new Map<string, number>();
      categories.set(row.category, purchases);
      purchasesByMonth.set(row.month, categories);
    }
    const refunds = row.refunds || 0;
    if (refunds > 0) {
      refundsByMonth.set(
        row.month,
        (refundsByMonth.get(row.month) ?? 0) + refunds,
      );
    }
  }

  const paymentsByMonth = new Map<number, number>();
  for (const row of paymentRows) {
    paymentsByMonth.set(row.month, row.amount || 0);
  }

  return safeNumber(
    cardCoveredThisMonth(
      currentMonth,
      purchasesByMonth,
      refundsByMonth,
      paymentsByMonth,
    ),
  );
}

// Funded purchases move into available for payment. A refund stays there
// instead of going back to its category. If that money was already paid to
// the card, the refund is added again so the credit shows up on the card.
function cardCoveredThisMonth(
  currentMonth: number,
  purchasesByMonth: Map<number, Map<string, number>>,
  refundsByMonth: Map<number, number>,
  paymentsByMonth: Map<number, number>,
): number {
  const months = [
    ...new Set<number>([
      ...purchasesByMonth.keys(),
      ...refundsByMonth.keys(),
      ...paymentsByMonth.keys(),
    ]),
  ]
    .filter(month => month <= currentMonth)
    .sort((a, b) => a - b);

  let additions = 0;
  let payments = 0;

  for (const month of months) {
    let funded = 0;
    for (const [categoryId, purchases] of purchasesByMonth.get(month) ?? []) {
      funded += fundedPortion(categoryId, month, purchases);
    }

    // Payments in the same month are treated as already sent, so a refund
    // that month is new credit on the card rather than money still set aside.
    const reserve = Math.max(
      0,
      additions + funded - payments - (paymentsByMonth.get(month) ?? 0),
    );
    const extraRefund = Math.max(0, (refundsByMonth.get(month) ?? 0) - reserve);
    const monthCovered = funded + extraRefund;
    if (month === currentMonth) {
      return monthCovered;
    }

    additions += monthCovered;
    payments += paymentsByMonth.get(month) ?? 0;
  }

  return 0;
}

function fundedPortion(
  categoryId: string,
  month: number,
  cardSpend: number,
): number {
  const sheetName = sheetForYyyymm(month);
  const prevSheetName = sheetForYyyymm(previousYyyymm(month));
  const budgeted = number(
    sheet.get().getCellValue(sheetName, `budget-${categoryId}`),
  );
  const sumAmount = number(
    sheet.get().getCellValue(sheetName, `sum-amount-${categoryId}`),
  );
  const carryover = sheet
    .get()
    .getCellValue(prevSheetName, `carryover-${categoryId}`);
  const prevLeftover = number(
    sheet.get().getCellValue(prevSheetName, `leftover-${categoryId}`),
  );
  const prevLeftoverPos = number(
    sheet.get().getCellValue(prevSheetName, `leftover-pos-${categoryId}`),
  );
  const carried = carryover ? prevLeftover : prevLeftoverPos;
  const availableForCard = budgeted + (sumAmount - cardSpend) + carried;
  const outflow = -cardSpend;

  if (availableForCard >= outflow) {
    return outflow;
  }
  if (availableForCard > 0) {
    return availableForCard;
  }
  return 0;
}

function sheetForYyyymm(yyyymm: number): string {
  const text = String(yyyymm).padStart(6, '0');
  return monthUtils.sheetForMonth(`${text.slice(0, 4)}-${text.slice(4)}`);
}

function previousYyyymm(yyyymm: number): number {
  const text = String(yyyymm).padStart(6, '0');
  const prev = monthUtils.prevMonth(`${text.slice(0, 4)}-${text.slice(4)}`);
  return parseInt(prev.replace('-', ''), 10);
}

function yyyymmFromSheet(sheetName: string): number {
  return parseInt(sheetName.slice('budget'.length), 10);
}

export function createCashRefundCell(sheetName: string): void {
  const { start, end } = boundsForSheet(sheetName);
  sheet.get().createDynamic(sheetName, 'cash-refunds', {
    initialValue: 0,
    run: () => cashRefunds(start, end),
  });
}

export function recomputeCashRefunds(month: string): void {
  const name = resolveName(monthUtils.sheetForMonth(month), 'cash-refunds');
  if (sheet.get().hasCell(name)) {
    sheet.get().recompute(name);
  }
}

function cashRefunds(start: number, end: number): number {
  const rows = db.runQuery<AmountRow>(
    `SELECT SUM(t.amount) AS amount
       FROM v_transactions_internal_alive t
       JOIN accounts a ON a.id = t.account
       JOIN categories c ON c.id = t.category
      WHERE t.date >= ? AND t.date <= ?
        AND a.offbudget = 0
        AND a.payment_category IS NULL
        AND IFNULL(c.is_income, 0) = 0
        AND t.amount > 0
        AND t.transfer_id IS NULL
        AND IFNULL(t.starting_balance_flag, 0) = 0
        AND IFNULL(t.is_parent, 0) = 0`,
    [start, end],
    true,
  );
  return rows[0]?.amount || 0;
}

function transferPayments(
  accountId: string,
  start: number,
  end: number,
): number {
  const rows = db.runQuery<AmountRow>(
    `SELECT SUM(amount) AS amount
       FROM v_transactions_internal_alive
      WHERE date >= ? AND date <= ?
        AND account = ?
        AND transfer_id IS NOT NULL
        AND amount > 0
        AND IFNULL(is_parent, 0) = 0`,
    [start, end, accountId],
    true,
  );
  return rows[0]?.amount || 0;
}

function accountBalance(accountId: string, sheetName: string): number {
  const month = `${sheetName.slice('budget'.length, 'budget'.length + 4)}-${sheetName.slice('budget'.length + 4)}`;
  const isPastMonth = month < monthUtils.currentMonth();
  const params: Array<string | number> = [accountId];
  let throughMonthEnd = '';
  if (isPastMonth) {
    throughMonthEnd = 'AND date <= ?';
    params.push(boundsForSheet(sheetName).end);
  }

  const rows = db.runQuery<AmountRow>(
    `SELECT SUM(amount) AS amount
       FROM v_transactions_internal_alive
      WHERE account = ?
        AND IFNULL(is_parent, 0) = 0
        ${throughMonthEnd}`,
    params,
    true,
  );
  return rows[0]?.amount || 0;
}

function coverageDependencyNames(
  sheetName: string,
  prevSheetName: string,
  categoryId: string,
): string[] {
  return [
    `${sheetName}!budget-${categoryId}`,
    `${sheetName}!sum-amount-${categoryId}`,
    `${sheetName}!carryover-${categoryId}`,
    `${prevSheetName}!leftover-${categoryId}`,
    `${prevSheetName}!carryover-${categoryId}`,
    `${prevSheetName}!leftover-pos-${categoryId}`,
  ];
}

function ensureGroupDebtBalance(categoryId: string, sheetName: string): void {
  const groupId = categoryGroupId(categoryId);
  if (!groupId) {
    return;
  }

  const cellName = `group-debt-balance-${groupId}`;
  if (!sheet.get().hasCell(resolveName(sheetName, cellName))) {
    sheet.get().createDynamic(sheetName, cellName, {
      initialValue: 0,
      dependencies: [`debt-balance-${categoryId}`],
      run: sumAmounts,
    });
    return;
  }

  sheet
    .get()
    .addDependencies(sheetName, cellName, [`debt-balance-${categoryId}`]);
}

function removeGroupDebtBalance(categoryId: string, sheetName: string): void {
  const groupId = categoryGroupId(categoryId);
  if (!groupId) {
    return;
  }

  const cellName = `group-debt-balance-${groupId}`;
  if (!sheet.get().hasCell(resolveName(sheetName, cellName))) {
    return;
  }

  sheet
    .get()
    .removeDependencies(sheetName, cellName, [`debt-balance-${categoryId}`]);
}

function categoryGroupId(categoryId: string): string | null {
  const rows = db.runQuery<{ cat_group: string | null }>(
    `SELECT cat_group FROM categories WHERE id = ?`,
    [categoryId],
    true,
  );
  return rows[0]?.cat_group ?? null;
}

function listPaymentLinks(): PaymentLink[] {
  return db.runQuery<PaymentLink>(
    `SELECT id, payment_category
       FROM accounts
      WHERE payment_category IS NOT NULL
        AND IFNULL(tombstone, 0) = 0`,
    [],
    true,
  );
}

function listPaymentCategoryIds(): string[] {
  return listPaymentLinks().map(link => link.payment_category);
}

export function getLinkedAccountId(categoryId: string): string | null {
  const rows = db.runQuery<{ id: string }>(
    `SELECT id FROM accounts
      WHERE payment_category = ?
        AND IFNULL(tombstone, 0) = 0
      LIMIT 1`,
    [categoryId],
    true,
  );
  return rows[0]?.id ?? null;
}

function getPaymentCategoryForAccount(accountId: string): string | null {
  const rows = db.runQuery<{ payment_category: string | null }>(
    `SELECT payment_category FROM accounts
      WHERE id = ?
        AND IFNULL(tombstone, 0) = 0`,
    [accountId],
    true,
  );
  return rows[0]?.payment_category ?? null;
}

function listExpenseCategoryIds(): string[] {
  const paymentIds = new Set(listPaymentCategoryIds());
  const rows = db.runQuery<{ id: string }>(
    `SELECT id FROM categories
      WHERE IFNULL(tombstone, 0) = 0
        AND IFNULL(is_income, 0) = 0`,
    [],
    true,
  );
  return rows.map(row => row.id).filter(id => !paymentIds.has(id));
}

function isExpenseCategory(categoryId: string): boolean {
  const rows = db.runQuery<{ is_income: number | null }>(
    `SELECT is_income FROM categories WHERE id = ? AND IFNULL(tombstone, 0) = 0`,
    [categoryId],
    true,
  );
  const row = rows[0];
  if (!row) {
    return false;
  }
  return !row.is_income;
}
