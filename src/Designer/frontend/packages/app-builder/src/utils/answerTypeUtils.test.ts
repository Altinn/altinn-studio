import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { LayoutComponent } from '../types';
import {
  answerTypes,
  getAnswerType,
  getSchemaFieldForAnswerType,
  setAnswerType,
  setAnswerTypeOnField,
} from './answerTypeUtils';

const input: LayoutComponent = { id: 'input', type: ComponentType.Input };

describe('answer types', () => {
  it.each(answerTypes)('reads back the answer type %s it set', (type) => {
    const component = setAnswerType(input, type);
    expect(getAnswerType(component, getSchemaFieldForAnswerType(type))).toBe(type);
  });

  it('removes the formatting and autocomplete of the previous type', () => {
    const amount = setAnswerType(setAnswerType(input, 'email'), 'amount');
    expect(amount).not.toHaveProperty('autocomplete');
    expect(setAnswerType(amount, 'text')).toEqual(input);
  });

  it('reads formatting set by hand that matches no type as text', () => {
    expect(getAnswerType({ ...input, autocomplete: 'name' })).toBe('text');
  });
});

describe('setAnswerTypeOnField', () => {
  it('changes only what the answer type decides, and keeps the rest of the field', () => {
    const field = { type: 'string', maxLength: 100, description: 'E-post', pattern: '^a$' };
    expect(setAnswerTypeOnField(field, 'number')).toEqual({
      type: 'number',
      maxLength: 100,
      description: 'E-post',
    });
  });
});
