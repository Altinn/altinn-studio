import { getLayoutSetIcon } from './getLayoutSetIcon';
import type { UiFolderLayoutSetModel } from 'app-shared/types/api/dto/UiFolderLayoutSetModel';
import { QuestionmarkIcon } from '@studio/icons';

describe('getLayoutSetIcon', () => {
  it('should return default icon for unknown types', () => {
    const layoutSet = constructLayoutSetModel({
      id: 'unknown-id',
      dataType: '',
      type: 'unknown-type',
    });
    const result = getLayoutSetIcon(layoutSet);

    expect(result.icon.type).toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBe('grey');
  });

  it('should return icon and iconColor for custom receipt', () => {
    const layoutSet = constructLayoutSetModel({
      id: 'CustomReceipt',
      taskType: '',
    });
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for subform', () => {
    const layoutSet = constructLayoutSetModel({
      type: 'subform',
    });

    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for data tasks', () => {
    const layoutSet = constructLayoutSetModel({
      taskType: 'data',
    });
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for signing tasks', () => {
    const layoutSet = constructLayoutSetModel({
      taskType: 'signing',
    });
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for user controlled signing tasks', () => {
    const layoutSet = constructLayoutSetModel({
      taskType: 'userControlledSigning',
    });
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });
});

function constructLayoutSetModel(
  overrides: Partial<UiFolderLayoutSetModel>,
): UiFolderLayoutSetModel {
  return {
    id: '',
    dataType: '',
    type: '',
    taskType: '',
    ...overrides,
  };
}
