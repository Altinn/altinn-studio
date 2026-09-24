import { orderSelectedDataTypes } from './dataTypeOrdering';

describe('orderSelectedDataTypes', () => {
  it('keeps the order the ids already had, whatever order they are reported in', () => {
    expect(
      orderSelectedDataTypes(
        ['ref-data-as-pdf', 'model', 'attachment'],
        ['attachment', 'ref-data-as-pdf', 'model'],
      ),
    ).toEqual(['ref-data-as-pdf', 'model', 'attachment']);
  });

  it('appends a newly chosen id rather than placing it where it was reported', () => {
    expect(orderSelectedDataTypes(['ref-data-as-pdf'], ['model', 'ref-data-as-pdf'])).toEqual([
      'ref-data-as-pdf',
      'model',
    ]);
  });

  it('drops a deselected id and leaves the rest where they were', () => {
    expect(
      orderSelectedDataTypes(['ref-data-as-pdf', 'model', 'attachment'], ['attachment', 'model']),
    ).toEqual(['model', 'attachment']);
  });

  it('appends several new ids in the order they were reported', () => {
    expect(orderSelectedDataTypes([], ['model', 'ref-data-as-pdf'])).toEqual([
      'model',
      'ref-data-as-pdf',
    ]);
  });

  it('empties the list when nothing is selected', () => {
    expect(orderSelectedDataTypes(['ref-data-as-pdf', 'model'], [])).toEqual([]);
  });
});
