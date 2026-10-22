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
});
