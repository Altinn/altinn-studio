import React, { useEffect, useState } from 'react';
import type { MonthCaption } from 'react-day-picker';

import { Radio, Textfield } from '@digdir/designsystemet-react';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

import { DatePickerControl } from 'src/app-components/Datepicker/Datepicker';
import { getDateFormat } from 'src/app-components/Datepicker/utils/dateHelpers';
import { getDatepickerFormat } from 'src/utils/dateUtils';

export type FormDataValue = string | number | boolean | null | FormDataValue[] | { [key: string]: FormDataValue };

export interface FormDataObject {
  [key: string]: FormDataValue;
}

export interface DynamicFormProps {
  schema: JSONSchema7;
  onChange: (data: FormDataObject) => void;
  initialData?: FormDataObject;
  locale?: string;
  DropdownCaption: typeof MonthCaption;
  buttonAriaLabel: string;
  calendarIconTitle: string;
}

export function DynamicForm({
  schema,
  onChange,
  initialData,
  locale,
  DropdownCaption,
  buttonAriaLabel,
  calendarIconTitle,
}: DynamicFormProps) {
  const [formData, setFormData] = useState<FormDataObject>(initialData || {});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (key: string, value: FormDataValue) => {
    const newData = { ...formData, [key]: value };
    onChange(newData);
  };

  const renderFields = (currentSchema: JSONSchema7) => {
    if (currentSchema.type === 'object' && currentSchema.properties) {
      return Object.keys(currentSchema.properties).map((key) => (
        <FieldRenderer
          key={key}
          fieldKey={key}
          fieldSchema={currentSchema.properties![key]}
          formData={formData}
          handleChange={handleChange}
          schema={schema}
          renderFields={renderFields}
          locale={locale}
          buttonAriaLabel={buttonAriaLabel}
          calendarIconTitle={calendarIconTitle}
          DropdownCaption={DropdownCaption}
        />
      ));
    }
    return null;
  };

  return <form>{renderFields(schema)}</form>;
}

interface Component {
  type: string;
  options?: { label: string; value: string }[];
  dateFormat?: string;
}

interface FieldRendererProps {
  rowIndex?: number;
  fieldKey: string;
  fieldSchema: JSONSchema7Definition;
  formData: FormDataObject;
  handleChange: (key: string, value: FormDataValue) => void;
  schema: JSONSchema7;
  component?: Component;
  renderFields?: (currentSchema: JSONSchema7) => React.ReactNode | null;
  locale?: string;
  DropdownCaption: typeof MonthCaption;
  buttonAriaLabel: string;
  calendarIconTitle: string;
}

export function FieldRenderer({
  rowIndex,
  fieldKey,
  fieldSchema,
  formData,
  handleChange,
  schema,
  component,
  renderFields,
  locale,
  DropdownCaption,
  buttonAriaLabel,
  calendarIconTitle,
}: FieldRendererProps) {
  if (typeof fieldSchema === 'boolean') {
    return null;
  } else {
    const { type, enum: enumOptions } = fieldSchema;
    const renderType = component?.type || type;
    const label = fieldSchema.title || fieldKey;
    const required = schema.required?.includes(fieldKey);
    const dateFormat = getDatepickerFormat(getDateFormat(component?.dateFormat, locale));
    if (enumOptions) {
      return (
        <div key={fieldKey}>
          <label>{label}</label>
          <select
            value={(formData[fieldKey] as string | number | undefined) || ''}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            required={required}
          >
            <option
              value=''
              disabled
            >
              Select an option
            </option>
            {enumOptions.map((option) => (
              <option
                key={String(option)}
                value={String(option)}
              >
                {String(option)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    switch (renderType) {
      case 'string':
        return (
          <div
            key={fieldKey}
            style={{ marginBottom: '10px' }}
          >
            <Textfield
              label={label}
              data-size='sm'
              required={required}
              value={(formData[fieldKey] as string) || ''}
              onChange={(e) => handleChange(fieldKey, e.target.value)}
            />
          </div>
        );
      case 'number':
      case 'integer':
        return (
          <div
            key={fieldKey}
            style={{ marginBottom: '10px' }}
          >
            <Textfield
              label={label}
              data-size='sm'
              type='number'
              required={required}
              value={formData[fieldKey] !== undefined ? String(formData[fieldKey]) : ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleChange(fieldKey, Number(e.target.value));
                }
              }}
            />
          </div>
        );
      case 'boolean':
        return (
          <div key={fieldKey}>
            <label>
              <input
                type='checkbox'
                checked={Boolean(formData[fieldKey])}
                onChange={(e) => handleChange(fieldKey, e.target.checked)}
              />
              {label}
            </label>
          </div>
        );
      case 'object':
        return (
          <div key={fieldKey}>
            <fieldset>
              <legend>{label}</legend>
              {renderFields && renderFields(fieldSchema)}
            </fieldset>
          </div>
        );
      case 'radio':
        return (
          <div key={fieldKey}>
            {component?.options?.map(({ label, value }) => (
              <Radio
                data-size='sm'
                key={value}
                value={value}
                checked={formData[fieldKey] === value}
                onChange={(e) => {
                  handleChange(fieldKey, e.target.value);
                }}
                name={`${fieldKey}-${rowIndex}`}
                label={label}
              />
            ))}
          </div>
        );

      case 'date':
        return (
          <DatePickerControl
            id={fieldKey}
            value={formData[fieldKey] as string}
            dateFormat={dateFormat}
            timeStamp={false}
            onValueChange={(isoDateString) => handleChange(fieldKey, isoDateString)}
            readOnly={false}
            required={required}
            locale={locale!}
            DropdownCaption={DropdownCaption}
            buttonAriaLabel={buttonAriaLabel}
            calendarIconTitle={calendarIconTitle}
          />
        );

      default:
        return null;
    }
  }
}
