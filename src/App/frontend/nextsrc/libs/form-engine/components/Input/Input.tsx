import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';
import { NumericFormat, PatternFormat } from 'react-number-format';
import { useStore } from 'zustand';

import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import classes from 'nextsrc/libs/form-engine/components/Input/Input.module.css';
import { isNumericFormat, isPatternFormat, useNumberFormatConfig } from 'nextsrc/libs/form-engine/components/Input/numberFormat';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompInputExternal } from 'src/layout/Input/config.generated';

export const Input = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompInputExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);

  const descriptionKey =
    typeof props.textResourceBindings?.description === 'string' ? props.textResourceBindings.description : undefined;
  const description = useTextResource(descriptionKey);
  const prefixKey = typeof props.textResourceBindings?.prefix === 'string' ? props.textResourceBindings.prefix : undefined;
  const prefixText = useTextResource(prefixKey);
  const suffixKey = typeof props.textResourceBindings?.suffix === 'string' ? props.textResourceBindings.suffix : undefined;
  const suffixText = useTextResource(suffixKey);

  const client = useFormClient();
  const language = useStore(client.textResourceStore, (state) => state.language);
  const formatting = props.formatting as
    | { number?: Record<string, unknown>; currency?: string; unit?: string; position?: 'prefix' | 'suffix'; align?: 'left' | 'center' | 'right' }
    | undefined;
  const numberFormatConfig = useNumberFormatConfig(formatting, String(value ?? ''), language);
  const numberFormat = numberFormatConfig?.number;

  const formValue = String(value ?? '');
  const alignClass = formatting?.align ? classes[`text-align-${formatting.align}`] : undefined;

  if (!simpleBinding) {
    return (
      <Textfield
        label={title || ''}
        disabled
      />
    );
  }

  // Number format variant
  if (numberFormat && isNumericFormat(numberFormat)) {
    return (
      <div className={alignClass}>
        <NumericFormat
          customInput={Textfield}
          label={title || ''}
          description={description || undefined}
          prefix={numberFormat.prefix || prefixText || undefined}
          suffix={numberFormat.suffix || suffixText || undefined}
          required={required}
          readOnly={props.readOnly as boolean | undefined}
          id={props.id}
          value={formValue}
          thousandSeparator={numberFormat.thousandSeparator}
          decimalSeparator={numberFormat.decimalSeparator}
          decimalScale={numberFormat.decimalScale}
          allowNegative={numberFormat.allowNegative}
          allowLeadingZeros={numberFormat.allowLeadingZeros}
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source === 'prop') {
              return;
            }
            setValue(values.value);
          }}
          autoComplete={props.autocomplete}
        />
        <ComponentValidations bindingPath={simpleBinding} />
      </div>
    );
  }

  // Pattern format variant
  if (numberFormat && isPatternFormat(numberFormat)) {
    return (
      <div className={alignClass}>
        <PatternFormat
          customInput={Textfield}
          label={title || ''}
          description={description || undefined}
          prefix={prefixText || undefined}
          suffix={suffixText || undefined}
          required={required}
          readOnly={props.readOnly as boolean | undefined}
          id={props.id}
          value={formValue}
          format={numberFormat.format}
          mask={numberFormat.mask}
          onValueChange={(values, sourceInfo) => {
            if (sourceInfo.source === 'prop') {
              return;
            }
            setValue(values.value);
          }}
          autoComplete={props.autocomplete}
        />
        <ComponentValidations bindingPath={simpleBinding} />
      </div>
    );
  }

  // Text/search variant
  return (
    <div className={alignClass}>
      <Textfield
        label={title || ''}
        description={description || undefined}
        prefix={prefixText || undefined}
        suffix={suffixText || undefined}
        id={props.id}
        type={props.variant === 'search' ? 'search' : 'text'}
        required={required}
        readOnly={props.readOnly as boolean | undefined}
        value={formValue}
        onChange={(e) => setValue(e.target.value)}
        autoComplete={props.autocomplete}
        counter={props.maxLength ?? undefined}
      />
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
