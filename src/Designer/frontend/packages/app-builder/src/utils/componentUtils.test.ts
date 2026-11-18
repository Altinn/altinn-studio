import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import { canBeRequired, getRequiredProperty, setRequiredValue } from './componentUtils';

describe('canBeRequired', () => {
  it('is true for questions and false for texts', () => {
    expect(canBeRequired({ id: 'a', type: ComponentType.Input })).toBe(true);
    expect(canBeRequired({ id: 'a', type: ComponentType.Heading })).toBe(false);
  });
});

describe('getRequiredProperty', () => {
  it('reads a static value', () => {
    expect(getRequiredProperty({ id: 'a', type: ComponentType.Input, required: true })).toEqual({
      kind: 'always',
    });
    expect(getRequiredProperty({ id: 'a', type: ComponentType.Input })).toEqual({ kind: 'never' });
  });

  it('reads a file upload as required when it needs an attachment', () => {
    const fileUpload = { id: 'a', type: ComponentType.FileUpload, minNumberOfAttachments: 1 };
    expect(getRequiredProperty(fileUpload)).toEqual({ kind: 'always' });
  });
});

describe('required only when, on a file upload', () => {
  const rule = { componentId: 'way', operator: 'is' as const, values: ['attachment'] };
  const condition = ['equals', ['component', 'way'], 'attachment'];

  it('needs one attachment when the rule is true, and reads the rule back', () => {
    const component = setRequiredValue({ id: 'a', type: ComponentType.FileUpload }, condition);
    expect(component.minNumberOfAttachments).toEqual(['if', condition, 1, 'else', 0]);
    expect(getRequiredProperty(component)).toEqual({ kind: 'rule', rule });
  });

  it('reads another expression as advanced', () => {
    const component = {
      id: 'a',
      type: ComponentType.FileUpload,
      minNumberOfAttachments: ['if', condition, 2, 'else', 0],
    };
    expect(getRequiredProperty(component)).toEqual({ kind: 'advanced' });
  });
});

describe('setRequiredValue', () => {
  it('leaves out the property when the field is made optional', () => {
    const component = { id: 'a', type: ComponentType.Input, required: true };
    expect(setRequiredValue(component, false)).not.toHaveProperty('required');
  });

  it('sets the minimum number of attachments of a file upload', () => {
    const component = { id: 'a', type: ComponentType.FileUpload };
    expect(setRequiredValue(component, true)).toMatchObject({ minNumberOfAttachments: 1 });
  });
});
