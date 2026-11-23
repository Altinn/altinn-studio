import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent } from '../types';

/**
 * What kind of answer a short text field takes. One choice sets the field's formatting and
 * autocomplete in the layout and its type or pattern in the data model, so the user does not have to
 * keep the three in step.
 */
export type AnswerType =
  'text' | 'number' | 'amount' | 'email' | 'phone' | 'nationalIdentityNumber' | 'postalCode';

export const answerTypes: AnswerType[] = [
  'text',
  'number',
  'amount',
  'email',
  'phone',
  'nationalIdentityNumber',
  'postalCode',
];

type NumberFormatting = {
  thousandSeparator: string;
  decimalSeparator: string;
  suffix?: string;
};

type AnswerTypeConfig = {
  numberFormatting?: NumberFormatting;
  autocomplete?: string;
  schemaField: JsonSchema;
};

const norwegianNumber: NumberFormatting = { thousandSeparator: ' ', decimalSeparator: ',' };
const textField: JsonSchema = { type: 'string' };

const answerTypeConfigs: Record<AnswerType, AnswerTypeConfig> = {
  text: { schemaField: textField },
  number: { numberFormatting: norwegianNumber, schemaField: { type: 'number' } },
  amount: {
    numberFormatting: { ...norwegianNumber, suffix: ' kr' },
    schemaField: { type: 'number' },
  },
  email: {
    autocomplete: 'email',
    schemaField: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
  },
  phone: {
    autocomplete: 'tel',
    schemaField: { type: 'string', pattern: '^\\+?[0-9 ]{8,15}$' },
  },
  nationalIdentityNumber: { schemaField: { type: 'string', pattern: '^[0-9]{11}$' } },
  postalCode: {
    autocomplete: 'postal-code',
    schemaField: { type: 'string', pattern: '^[0-9]{4}$' },
  },
};

/**
 * Reads the answer type back from the component and its data model field. Formatting, autocomplete
 * or a pattern set by hand that matches no answer type counts as text.
 */
export function getAnswerType(component: LayoutComponent, field?: JsonSchema): AnswerType {
  const numberFormatting = component.formatting?.number;
  if (numberFormatting) return numberFormatting.suffix?.trim() === 'kr' ? 'amount' : 'number';
  const byAutocomplete = answerTypes.find(
    (type) => answerTypeConfigs[type].autocomplete === component.autocomplete,
  );
  if (component.autocomplete && byAutocomplete) return byAutocomplete;
  const byPattern = answerTypes.find(
    (type) => field?.pattern && answerTypeConfigs[type].schemaField.pattern === field.pattern,
  );
  return byPattern ?? 'text';
}

/** Returns the component with the formatting and autocomplete of the answer type. */
export function setAnswerType(component: LayoutComponent, type: AnswerType): LayoutComponent {
  const { formatting: _formatting, autocomplete: _autocomplete, ...rest } = component;
  const { numberFormatting, autocomplete } = answerTypeConfigs[type];
  return {
    ...rest,
    ...(numberFormatting && { formatting: { number: numberFormatting } }),
    ...(autocomplete && { autocomplete }),
  };
}

/** The data model field for the answer type: a number, or a string with a pattern. */
export function getSchemaFieldForAnswerType(type: AnswerType): JsonSchema {
  return answerTypeConfigs[type].schemaField;
}

/**
 * Changes an existing data model field to the answer type. Only what the answer type decides is
 * replaced, so restrictions and descriptions the field has are kept.
 */
export function setAnswerTypeOnField(field: JsonSchema | undefined, type: AnswerType): JsonSchema {
  const { type: _type, pattern: _pattern, format: _format, ...rest } = field ?? {};
  return { ...rest, ...answerTypeConfigs[type].schemaField };
}
