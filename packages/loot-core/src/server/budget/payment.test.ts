import { beforeEach, describe, expect, it } from 'vitest';

import * as db from '#server/db';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';

import { setBudget } from './actions';
import { createAllBudgets } from './base';

beforeEach(() => {
  return global.emptyDatabase()();
});

async function setupBudget() {
  await sheet.loadSpreadsheet(db);

  const incomeGroupId = await db.insertCategoryGroup({
    name: 'Income',
    is_income: 1,
  });
  const incomeCategoryId = await db.insertCategory({
    name: 'Salary',
    cat_group: incomeGroupId,
    is_income: 1,
  });

  const expenseGroupId = await db.insertCategoryGroup({
    name: 'Everyday',
    is_income: 0,
  });
  const groceriesId = await db.insertCategory({
    name: 'Groceries',
    cat_group: expenseGroupId,
    is_income: 0,
  });

  const debtGroupId = await db.insertCategoryGroup({
    name: 'Credit & Debt',
    is_income: 0,
  });
  const cardCategoryId = await db.insertCategory({
    name: 'Amex',
    cat_group: debtGroupId,
    is_income: 0,
  });

  await db.insertAccount({ id: 'checking', name: 'Checking' });
  await db.insertAccount({
    id: 'amex',
    name: 'Amex',
    payment_category: cardCategoryId,
  });

  await createAllBudgets();

  const month = monthUtils.currentMonth();
  const sheetName = monthUtils.sheetForMonth(month);
  const date = `${month}-15`;

  await db.insertTransaction({
    account: 'checking',
    amount: 100000,
    category: incomeCategoryId,
    date,
  });
  await sheet.waitOnSpreadsheet();

  return { groceriesId, cardCategoryId, month, sheetName, date };
}

describe('credit and debt payment categories', () => {
  it('moves a funded card purchase into available for payment without changing To budget', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await sheet.waitOnSpreadsheet();

    const toBudget = sheet.getCellValue(sheetName, 'to-budget');

    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(toBudget);
    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(1400);
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      600,
    );
    expect(
      sheet.getCellValue(sheetName, `debt-balance-${cardCategoryId}`),
    ).toBe(-600);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(monthUtils.nextMonth(month)),
        `leftover-${cardCategoryId}`,
      ),
    ).toBe(600);
  });

  it('moves only the funded part of a card purchase', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 400 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(-200);
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      400,
    );
  });

  it('does not raise available for payment when the purchase is unfunded', async () => {
    const { groceriesId, cardCategoryId, sheetName, date } =
      await setupBudget();

    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(-600);
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(0);
    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(100000);
  });

  it('lowers To budget when money is budgeted onto the debt row', async () => {
    const { cardCategoryId, month, sheetName } = await setupBudget();

    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(100000);

    await setBudget({ category: cardCategoryId, month, amount: 45000 });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(55000);
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      45000,
    );
  });

  it('lowers available for payment when the card payment is recorded', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      600,
    );

    const cardPaymentId = await db.insertTransaction({
      account: 'amex',
      amount: 600,
      date,
      transfer_id: 'checking-side',
    });
    await db.insertTransaction({
      id: 'checking-side',
      account: 'checking',
      amount: -600,
      date,
      transfer_id: cardPaymentId,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(0);
    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(1400);
    expect(sheet.getCellValue(sheetName, `sum-amount-${groceriesId}`)).toBe(
      -600,
    );
    expect(
      sheet.getCellValue(sheetName, `debt-balance-${cardCategoryId}`),
    ).toBe(0);
  });

  it('keeps a card refund in available for payment instead of the spending category', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    const nextMonth = monthUtils.nextMonth(month);
    const nextSheet = monthUtils.sheetForMonth(nextMonth);
    await db.insertTransaction({
      account: 'amex',
      amount: 200,
      category: groceriesId,
      date: `${nextMonth}-10`,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(nextSheet, `leftover-${groceriesId}`)).toBe(1400);
    expect(sheet.getCellValue(nextSheet, `sum-amount-${groceriesId}`)).toBe(0);
    expect(sheet.getCellValue(nextSheet, `leftover-${cardCategoryId}`)).toBe(
      600,
    );
    expect(sheet.getCellValue(nextSheet, 'to-budget')).toBe(
      sheet.getCellValue(sheetName, 'to-budget'),
    );
  });

  it('adds a card refund to available for payment after the card has been paid', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    const cardPaymentId = await db.insertTransaction({
      account: 'amex',
      amount: 600,
      date,
      transfer_id: 'paid-checking',
    });
    await db.insertTransaction({
      id: 'paid-checking',
      account: 'checking',
      amount: -600,
      date,
      transfer_id: cardPaymentId,
    });
    await sheet.waitOnSpreadsheet();
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(0);

    const nextMonth = monthUtils.nextMonth(month);
    const nextSheet = monthUtils.sheetForMonth(nextMonth);
    const toBudget = sheet.getCellValue(nextSheet, 'to-budget');
    await db.insertTransaction({
      account: 'amex',
      amount: 600,
      category: groceriesId,
      date: `${nextMonth}-12`,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(nextSheet, `leftover-${cardCategoryId}`)).toBe(
      600,
    );
    expect(sheet.getCellValue(nextSheet, `leftover-${groceriesId}`)).toBe(1400);
    expect(sheet.getCellValue(nextSheet, `sum-amount-${groceriesId}`)).toBe(0);
    expect(sheet.getCellValue(nextSheet, 'to-budget')).toBe(toBudget);
  });

  it('adds a same-month card refund after the payment to available for payment', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    const cardPaymentId = await db.insertTransaction({
      account: 'amex',
      amount: 600,
      date,
      transfer_id: 'same-month-pay',
    });
    await db.insertTransaction({
      id: 'same-month-pay',
      account: 'checking',
      amount: -600,
      date,
      transfer_id: cardPaymentId,
    });
    await db.insertTransaction({
      account: 'amex',
      amount: 600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(1400);
    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      600,
    );
  });

  it('returns a checking refund to To Budget instead of the spending category', async () => {
    const { groceriesId, month, sheetName, date } = await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await sheet.waitOnSpreadsheet();
    const toBudget = sheet.getCellValue(sheetName, 'to-budget');

    await db.insertTransaction({
      account: 'checking',
      amount: 500,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `sum-amount-${groceriesId}`)).toBe(0);
    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(2000);
    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(
      numberValue(toBudget) + 500,
    );
  });

  it('carries a payment larger than the amount set aside as a negative balance', async () => {
    const { groceriesId, cardCategoryId, month, sheetName, date } =
      await setupBudget();

    await setBudget({ category: groceriesId, month, amount: 2000 });
    await db.insertTransaction({
      account: 'amex',
      amount: -600,
      category: groceriesId,
      date,
    });
    await sheet.waitOnSpreadsheet();

    const toBudget = sheet.getCellValue(sheetName, 'to-budget');
    const cardPaymentId = await db.insertTransaction({
      account: 'amex',
      amount: 1000,
      date,
      transfer_id: 'overpay-checking',
    });
    await db.insertTransaction({
      id: 'overpay-checking',
      account: 'checking',
      amount: -1000,
      date,
      transfer_id: cardPaymentId,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(sheetName, `leftover-${cardCategoryId}`)).toBe(
      -400,
    );
    expect(sheet.getCellValue(sheetName, 'to-budget')).toBe(toBudget);
    expect(sheet.getCellValue(sheetName, `leftover-${groceriesId}`)).toBe(1400);

    const nextMonth = monthUtils.nextMonth(month);
    const nextSheet = monthUtils.sheetForMonth(nextMonth);
    expect(sheet.getCellValue(nextSheet, `leftover-${cardCategoryId}`)).toBe(
      -400,
    );

    await setBudget({
      category: cardCategoryId,
      month: nextMonth,
      amount: 400,
    });
    await sheet.waitOnSpreadsheet();

    expect(sheet.getCellValue(nextSheet, `leftover-${cardCategoryId}`)).toBe(0);
    expect(sheet.getCellValue(nextSheet, 'to-budget')).toBe(
      numberValue(toBudget) - 400,
    );
  });

  it('shows the month-end balance in past months and the live balance from this month on', async () => {
    const { groceriesId, cardCategoryId, month, sheetName } =
      await setupBudget();
    const previousMonth = monthUtils.prevMonth(month);
    const nextMonth = monthUtils.nextMonth(month);
    const laterMonth = monthUtils.nextMonth(nextMonth);

    await db.insertTransaction({
      account: 'amex',
      amount: -80,
      category: groceriesId,
      date: `${laterMonth}-03`,
    });
    await db.insertTransaction({
      account: 'amex',
      amount: -250,
      category: groceriesId,
      date: `${nextMonth}-05`,
    });
    await db.insertTransaction({
      account: 'amex',
      amount: -400,
      category: groceriesId,
      date: `${month}-10`,
    });
    await db.insertTransaction({
      account: 'amex',
      amount: -1000,
      category: groceriesId,
      date: `${previousMonth}-20`,
    });
    await sheet.waitOnSpreadsheet();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(previousMonth),
        `debt-balance-${cardCategoryId}`,
      ),
    ).toBe(-1000);
    expect(
      sheet.getCellValue(sheetName, `debt-balance-${cardCategoryId}`),
    ).toBe(-1730);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(nextMonth),
        `debt-balance-${cardCategoryId}`,
      ),
    ).toBe(-1730);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(laterMonth),
        `debt-balance-${cardCategoryId}`,
      ),
    ).toBe(-1730);
  });
});

function numberValue(value: string | number | boolean): number {
  return typeof value === 'number' ? value : 0;
}
