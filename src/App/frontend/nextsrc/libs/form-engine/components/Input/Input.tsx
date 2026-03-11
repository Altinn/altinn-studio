import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';
import { useComponentBinding, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import classes from 'nextsrc/libs/form-engine/components/Input/Input.module.css';
import {
  isNumericFormat,
  isPatternFormat,
  useNumberFormatConfig,
} from 'nextsrc/libs/form-engine/components/Input/numberFormat';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import { useStore } from 'zustand';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import { Flex } from 'src/app-components/Flex/Flex';
import { FormattedInput } from 'src/app-components/Input/FormattedInput';
import { Input as AppInput } from 'src/app-components/Input/Input';
import { NumericInput } from 'src/app-components/Input/NumericInput';
import { Label } from 'src/app-components/Label/Label';
import type { CompInputExternal } from 'src/layout/Input/config.generated';

export const Input = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompInputExternal;
  const {
    field: simpleBindingField,
    value,
    setValue,
  } = useComponentBinding(props.dataModelBindings?.simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBindingField, value, title);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);

  const prefixKey =
    typeof props.textResourceBindings?.prefix === 'string' ? props.textResourceBindings.prefix : undefined;
  const suffixKey =
    typeof props.textResourceBindings?.suffix === 'string' ? props.textResourceBindings.suffix : undefined;

  const client = useFormClient();
  const language = useStore(client.textResourceStore, (state) => state.language);
  const formatting = props.formatting as
    | {
        number?: Record<string, unknown>;
        currency?: string;
        unit?: string;
        position?: 'prefix' | 'suffix';
        align?: 'left' | 'center' | 'right';
      }
    | undefined;
  const numberFormatConfig = useNumberFormatConfig(formatting, String(value ?? ''), language);
  const numberFormat = numberFormatConfig?.number;

  const formValue = String(value ?? '');
  const alignClass = formatting?.align ? classes[`text-align-${formatting.align}`] : undefined;

  if (!simpleBindingField) {
    return (
      <Textfield
        label={title || ''}
        disabled
      />
    );
  }

  const labelProps = titleKey ? { 'aria-label': asTranslationKey(titleKey)! } : { label: title as React.ReactNode };

  // Number format variant
  if (numberFormat && isNumericFormat(numberFormat)) {
    return (
      <Label
        label={title}
        htmlFor={props.id}
        required={required}
        requiredIndicator={requiredIndicator}
        help={help}
        description={description}
        grid={props.grid?.labelGrid}
      >
        <Flex
          item
          size={{ xs: 12 }}
          className={alignClass}
        >
          <NumericInput
            {...labelProps}
            id={props.id}
            prefix={asTranslationKey(numberFormat.prefix || prefixKey)}
            suffix={asTranslationKey(numberFormat.suffix || suffixKey)}
            required={required}
            readOnly={props.readOnly as boolean | undefined}
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
            maxLength={props.maxLength ?? undefined}
          />
          <ComponentValidations bindingPath={simpleBindingField} />
        </Flex>
      </Label>
    );
  }

  // Pattern format variant
  if (numberFormat && isPatternFormat(numberFormat)) {
    return (
      <Label
        label={title}
        htmlFor={props.id}
        required={required}
        requiredIndicator={requiredIndicator}
        help={help}
        description={description}
        grid={props.grid?.labelGrid}
      >
        <Flex
          item
          size={{ xs: 12 }}
          className={alignClass}
        >
          <FormattedInput
            {...labelProps}
            id={props.id}
            prefix={asTranslationKey(prefixKey)}
            suffix={asTranslationKey(suffixKey)}
            required={required}
            readOnly={props.readOnly as boolean | undefined}
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
            maxLength={props.maxLength ?? undefined}
          />
          <ComponentValidations bindingPath={simpleBindingField} />
        </Flex>
      </Label>
    );
  }

  // Text/search variant
  return (
    <Label
      label={title}
      htmlFor={props.id}
      required={required}
      requiredIndicator={requiredIndicator}
      help={help}
      description={description}
      grid={props.grid?.labelGrid}
    >
      <Flex
        item
        size={{ xs: 12 }}
        className={alignClass}
      >
        <AppInput
          {...labelProps}
          id={props.id}
          type={props.variant === 'search' ? 'search' : 'text'}
          prefix={asTranslationKey(prefixKey)}
          suffix={asTranslationKey(suffixKey)}
          required={required}
          readOnly={props.readOnly as boolean | undefined}
          value={formValue}
          onChange={(e) => setValue(e.target.value)}
          autoComplete={props.autocomplete}
          maxLength={props.maxLength ?? undefined}
        />
        <ComponentValidations bindingPath={simpleBindingField} />
      </Flex>
    </Label>
  );
};
