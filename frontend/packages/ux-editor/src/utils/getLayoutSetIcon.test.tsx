import React from 'react';
import { getLayoutSetIcon } from './getLayoutSetIcon';
import type { LayoutSetModel } from 'app-shared/types/api/dto/LayoutSetModel';
import { QuestionmarkIcon } from '@studio/icons';

describe('getLayoutSetIcon', () => {
  it('should return default icon for unknown types', () => {
    const layoutSet: LayoutSetModel = {
      id: 'unknown-id',
      dataType: '',
      type: 'unknown-type',
    };
    const result = getLayoutSetIcon(layoutSet);

    expect(result.icon.type).toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBe('grey');
  });

  it('should return icon and iconColor for custom receipt', () => {
    const layoutSet: LayoutSetModel = {
      id: '',
      dataType: '',
      type: '',
      task: {
        id: 'CustomReceipt',
        type: '',
      },
    };
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for subform', () => {
    const layoutSet: LayoutSetModel = {
      id: '',
      dataType: '',
      type: 'subform',
    };
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for data tasks', () => {
    const layoutSet: LayoutSetModel = {
      id: '',
      dataType: '',
      type: '',
      task: {
        id: '',
        type: 'data',
      },
    };
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });

  it('should return icon and iconColor for signing tasks', () => {
    const layoutSet: LayoutSetModel = {
      id: '',
      dataType: '',
      type: '',
      task: {
        id: '',
        type: 'signing',
      },
    };
    const result = getLayoutSetIcon(layoutSet);
    expect(result.icon).toBeTruthy();
    expect(result.icon.type).not.toBe((<QuestionmarkIcon />).type);
    expect(result.iconColor).toBeTruthy();
  });
});
