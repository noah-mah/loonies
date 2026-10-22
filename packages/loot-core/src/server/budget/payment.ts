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

type CardSpend = {
  category: string;
  amount: number | null;
};

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
  const sheetName = monthUtils.sheetForMonth(month);
  const spreadsheet = sheet.get();
  const paymentsCell = resolveName(sheetName, `payments-${categoryId}`);
  if (spreadsheet.hasCell(paymentsCell)) {
    spreadsheet.recompute(paymentsCell);
  }

  const createdMonths = spreadsheet.meta().createdMonths;
  if (!createdMonths) {
    return;
  }

  for (const createdMonth of createdMonths) {
    const balanceCell = resolveName(
      monthUtils.sheetForMonth(createdMonth),
      `debt-balance-${categoryId}`,
    );
    if (spreadsheet.hasCell(balanceCell)) {
      spreadsheet.recompute(balanceCell);
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
    run: () => accountBalance(accountId),
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
  prevSheetName: string,
  start: number,
  end: number,
): number {
  const paymentIds = new Set(listPaymentCategoryIds());
  const spends = db.runQuery<CardSpend>(
    `SELECT category, SUM(amount) AS amount
       FROM v_transactions_internal_alive
      WHERE date >= ? AND date <= ?
        AND account = ?
        AND category IS NOT NULL
        AND IFNULL(is_parent, 0) = 0
      GROUP BY category`,
    [start, end, accountId],
    true,
  );

  let covered = 0;
  for (const spend of spends) {
    if (paymentIds.has(spend.category)) {
      continue;
    }

    const cardSpend = spend.amount || 0;
    if (cardSpend >= 0) {
      continue;
    }

    const budgeted = number(
      sheet.get().getCellValue(sheetName, `budget-${spend.category}`),
    );
    const sumAmount = number(
      sheet.get().getCellValue(sheetName, `sum-amount-${spend.category}`),
    );
    const carryover = sheet
      .get()
      .getCellValue(prevSheetName, `carryover-${spend.category}`);
    const prevLeftover = number(
      sheet.get().getCellValue(prevSheetName, `leftover-${spend.category}`),
    );
    const prevLeftoverPos = number(
      sheet.get().getCellValue(prevSheetName, `leftover-pos-${spend.category}`),
    );
    const carried = carryover ? prevLeftover : prevLeftoverPos;
    const availableForCard = budgeted + (sumAmount - cardSpend) + carried;
    const outflow = -cardSpend;

    if (availableForCard >= outflow) {
      covered += outflow;
    } else if (availableForCard > 0) {
      covered += availableForCard;
    }
  }

  return safeNumber(covered);
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

function accountBalance(accountId: string): number {
  const rows = db.runQuery<AmountRow>(
    `SELECT SUM(amount) AS amount
       FROM v_transactions_internal_alive
      WHERE account = ?
        AND IFNULL(is_parent, 0) = 0`,
    [accountId],
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
