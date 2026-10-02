import { orderSelectedDataTypes } from './dataTypeOrdering';

describe('orderSelectedDataTypes', () => {
  it('preserves the order of existing data type IDs', () => {
    expect(
      orderSelectedDataTypes(
        ['ref-data-as-pdf', 'model', 'attachment'],
        ['attachment', 'ref-data-as-pdf', 'model'],
      ),
    ).toEqual(['ref-data-as-pdf', 'model', 'attachment']);
  });

  it('appends a newly selected ID', () => {
    expect(orderSelectedDataTypes(['ref-data-as-pdf'], ['model', 'ref-data-as-pdf'])).toEqual([
      'ref-data-as-pdf',
      'model',
    ]);
  });

  it('removes a deselected ID and preserves the remaining order', () => {
    expect(
      orderSelectedDataTypes(['ref-data-as-pdf', 'model', 'attachment'], ['attachment', 'model']),
    ).toEqual(['model', 'attachment']);
  });

  it('appends new IDs in selection order', () => {
    expect(orderSelectedDataTypes([], ['model', 'ref-data-as-pdf'])).toEqual([
      'model',
      'ref-data-as-pdf',
    ]);
  });

  it('empties the list when nothing is selected', () => {
    expect(orderSelectedDataTypes(['ref-data-as-pdf', 'model'], [])).toEqual([]);
  });
});
