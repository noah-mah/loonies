import { highlightedMonthSlice } from './highlightedMonthSlice';

describe('highlightedMonthSlice', () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr'];

  it('groups the selected months in the middle', () => {
    expect(highlightedMonthSlice(months, 1, 2)).toEqual({
      before: ['Jan'],
      highlighted: ['Feb', 'Mar'],
      after: ['Apr'],
    });
  });

  it('keeps a single selected month together', () => {
    expect(highlightedMonthSlice(months, 0, 1)).toEqual({
      before: [],
      highlighted: ['Jan'],
      after: ['Feb', 'Mar', 'Apr'],
    });
  });
});
