import { BackendValidationSeverity } from 'src/features/validation';
import {
  getIndexedComponentId,
  mapBackendIssuesToComponentValidations,
  mapBackendIssuesToFieldValidations,
  mapBackendIssuesToTaskValidations,
} from 'src/features/validation/backendValidation/backendValidationUtils';
import { updateIncrementalValidations } from 'src/features/validation/backendValidation/useUpdateIncrementalValidations';
import type { BackendValidationIssue } from 'src/features/validation';

function issue(overrides: Partial<BackendValidationIssue>): BackendValidationIssue {
  return {
    dataElementId: 'data-element',
    severity: BackendValidationSeverity.Error,
    source: 'Custom',
    customTextKey: 'message',
    ...overrides,
  };
}

describe('getIndexedComponentId', () => {
  it('returns undefined when the issue is not linked to a component', () => {
    expect(getIndexedComponentId(issue({ field: 'a' }))).toBeUndefined();
  });

  it('returns the component id when there are no row indexes', () => {
    expect(getIndexedComponentId(issue({ componentId: 'input' }))).toBe('input');
    expect(getIndexedComponentId(issue({ componentId: 'input', rowIndexes: [] }))).toBe('input');
  });

  it('appends row indexes like indexed node ids', () => {
    expect(getIndexedComponentId(issue({ componentId: 'input', rowIndexes: [2, 0] }))).toBe('input-2-0');
  });
});

describe('mapping backend issues', () => {
  const fieldOnly = issue({ field: 'group[1].name', customTextKey: 'field-only' });
  const fieldAndComponent = issue({
    field: 'group[1].name',
    componentId: 'name',
    rowIndexes: [1],
    customTextKey: 'field-and-component',
  });
  const componentOnly = issue({ componentId: 'name', rowIndexes: [1], customTextKey: 'component-only' });
  const taskOnly = issue({ customTextKey: 'task-only' });
  const all = [fieldOnly, fieldAndComponent, componentOnly, taskOnly];

  it('maps issues with a field to field validations, keeping the indexed component id', () => {
    const validations = mapBackendIssuesToFieldValidations(all);
    expect(validations.map((v) => [v.message.key, v.componentId])).toEqual([
      ['field-only', undefined],
      ['field-and-component', 'name-1'],
    ]);
  });

  it('maps issues linked to a component without a field to component validations', () => {
    const validations = mapBackendIssuesToComponentValidations(all);
    expect(validations).toHaveLength(1);
    expect(validations[0]).toMatchObject({
      componentId: 'name-1',
      dataElementId: 'data-element',
      message: { key: 'component-only' },
      severity: 'error',
    });
    expect(validations[0].backendValidationId).toEqual(expect.any(String));
  });

  it('maps issues linked to a component with a field but no data element to component validations', () => {
    const validations = mapBackendIssuesToComponentValidations([
      issue({ field: 'a', dataElementId: undefined, componentId: 'input' }),
    ]);
    expect(validations.map((v) => v.componentId)).toEqual(['input']);
  });

  it('only maps issues without field and component to task validations', () => {
    const validations = mapBackendIssuesToTaskValidations(all);
    expect(validations.map((v) => v.message.key)).toEqual(['task-only']);
  });
});

describe('updateIncrementalValidations', () => {
  it('keeps the component link of field validations from validators that did not run on save', () => {
    const update = vi.fn();
    updateIncrementalValidations(
      { Patched: [issue({ source: 'Patched', field: 'other', customTextKey: 'patched' })] },
      [issue({ source: 'Kept', field: 'group[1].name', componentId: 'name', rowIndexes: [1], customTextKey: 'kept' })],
      update,
    );

    expect(update).toHaveBeenCalledTimes(1);
    const backendValidations = update.mock.calls[0][0];
    expect(backendValidations['data-element']['group[1].name']).toEqual([
      expect.objectContaining({ componentId: 'name-1', message: { key: 'kept', customTextParameters: undefined } }),
    ]);
    expect(backendValidations['data-element'].other).toEqual([
      expect.not.objectContaining({ componentId: expect.anything() }),
    ]);
  });

  it('replaces component validations from validators that ran on save, and keeps the others', () => {
    const update = vi.fn();
    updateIncrementalValidations(
      {
        Patched: [issue({ source: 'Patched', componentId: 'patched', customTextKey: 'new' })],
      },
      [
        issue({ source: 'Patched', componentId: 'patched', customTextKey: 'old' }),
        issue({ source: 'Kept', componentId: 'kept', customTextKey: 'kept' }),
      ],
      update,
    );

    expect(update).toHaveBeenCalledTimes(1);
    const componentValidations = update.mock.calls[0][3];
    expect(componentValidations.map((v) => [v.componentId, v.message.key])).toEqual([
      ['kept', 'kept'],
      ['patched', 'new'],
    ]);
  });
});
