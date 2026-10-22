import { beforeEach, describe, expect, it } from 'vitest';

import { createAllBudgets } from '#server/budget/base';
import * as db from '#server/db';
import * as sheet from '#server/sheet';
import * as monthUtils from '#shared/months';

import { app } from './app';

beforeEach(() => {
  return global.emptyDatabase()();
});

describe('account kind', () => {
  it('creates a credit card in the budget with a payment category', async () => {
    const id = await app.handlers['account-create']({
      name: 'Amex',
      kind: 'credit',
      offBudget: true,
    });

    const account = await db.first<db.DbAccount>(
      'SELECT * FROM accounts WHERE id = ?',
      [id],
    );
    expect(account?.offbudget).toBe(0);
    const paymentCategory = account?.payment_category;
    expect(paymentCategory).toBeTruthy();

    const category = await db.first<{ cat_group: string }>(
      'SELECT cat_group FROM categories WHERE id = ?',
      [paymentCategory ?? ''],
    );
    const group = await db.first<{ name: string }>(
      'SELECT name FROM category_groups WHERE id = ?',
      [category?.cat_group ?? ''],
    );
    expect(group?.name).toBe('Credit Cards');
  });

  it('creates a loan off budget without a payment category', async () => {
    const id = await app.handlers['account-create']({
      name: 'Auto Loan',
      kind: 'debt',
      offBudget: false,
    });

    const account = await db.first<db.DbAccount>(
      'SELECT offbudget, payment_category FROM accounts WHERE id = ?',
      [id],
    );
    expect(account?.offbudget).toBe(1);
    expect(account?.payment_category ?? null).toBeNull();
  });

  it('puts a credit card starting balance on the current month payment row', async () => {
    await sheet.loadSpreadsheet(db);
    const incomeGroupId = await db.insertCategoryGroup({
      name: 'Income',
      is_income: 1,
    });
    await db.insertCategory({
      name: 'Starting Balances',
      cat_group: incomeGroupId,
      is_income: 1,
    });
    await createAllBudgets();

    await app.handlers['account-create']({
      name: 'Visa Test',
      kind: 'credit',
      balance: -200,
    });
    await sheet.waitOnSpreadsheet();

    const account = await db.first<db.DbAccount>(
      'SELECT payment_category FROM accounts WHERE name = ?',
      ['Visa Test'],
    );
    const categoryId = account?.payment_category ?? '';
    const month = monthUtils.currentMonth();

    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(month),
        `debt-balance-${categoryId}`,
      ),
    ).toBe(-20000);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(monthUtils.prevMonth(month)),
        `debt-balance-${categoryId}`,
      ),
    ).toBe(0);
    expect(
      sheet.getCellValue(monthUtils.sheetForMonth(month), 'to-budget'),
    ).toBe(0);
    expect(
      sheet.getCellValue(
        monthUtils.sheetForMonth(month),
        `leftover-${categoryId}`,
      ),
    ).toBe(0);
  });

  it('keeps a cash account off budget when asked', async () => {
    const id = await app.handlers['account-create']({
      name: 'House',
      kind: 'cash',
      offBudget: true,
    });

    const account = await db.first<db.DbAccount>(
      'SELECT offbudget, payment_category FROM accounts WHERE id = ?',
      [id],
    );
    expect(account?.offbudget).toBe(1);
    expect(account?.payment_category ?? null).toBeNull();
  });
});
