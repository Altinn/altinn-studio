import { transposeDataBinding } from 'src/utils/databindings/DataBinding';
import type { IDataModelReference } from 'src/layout/common.generated';

const dataType = 'model';

function binding(field: string, type = dataType): IDataModelReference {
  return { dataType: type, field };
}

describe('transposeDataBinding', () => {
  it('copies nested array indexes to matching subject segments', () => {
    const result = transposeDataBinding({
      currentLocation: binding('groups[2].items[3].value'),
      subject: binding('groups.items.label'),
    });

    expect(result).toEqual(binding('groups[2].items[3].label'));
  });

  it('does not treat a same-prefix field as a matching segment', () => {
    const subject = binding('personName');

    const result = transposeDataBinding({
      currentLocation: binding('person[2]'),
      subject,
    });

    expect(result).toEqual(subject);
  });

  it('stops before changing a subject that already has an array index', () => {
    const subject = binding('groups[9].items.label');

    const result = transposeDataBinding({
      currentLocation: binding('groups[2].items[3].value'),
      subject,
    });

    expect(result).toEqual(subject);
  });

  it('uses the provided row index for a repeating-group location', () => {
    const result = transposeDataBinding({
      currentLocation: binding('groups'),
      subject: binding('groups.label'),
      rowIndex: 4,
      currentLocationIsRepGroup: true,
    });

    expect(result).toEqual(binding('groups[4].label'));
  });

  it('returns the original subject when data types differ', () => {
    const subject = binding('groups.items.label', 'other-model');

    const result = transposeDataBinding({
      currentLocation: binding('groups[2].items[3].value'),
      subject,
    });

    expect(result).toBe(subject);
  });
});
