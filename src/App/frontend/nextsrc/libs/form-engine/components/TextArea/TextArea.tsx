import React from 'react';

import { useComponentBinding, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components';

import { Flex } from 'src/app-components/Flex/Flex';
import { useCharacterLimit } from 'src/app-components/Input/Input';
import { Label } from 'src/app-components/Label/Label';
import { TextArea as AppTextArea } from 'src/app-components/TextArea/TextArea';
import type { CompTextAreaExternal } from 'src/layout/TextArea/config.generated';

export const TextArea = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTextAreaExternal;
  const {
    field: simpleBindingField,
    value,
    setValue,
  } = useComponentBinding(props.dataModelBindings?.simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBindingField, value, title);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);
  const characterLimit = useCharacterLimit(props.maxLength ?? undefined);

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
      >
        <AppTextArea
          id={props.id}
          ariaLabel={asTranslationKey(titleKey)}
          value={String(value ?? '')}
          onChange={(v) => setValue(v)}
          readOnly={props.readOnly as boolean | undefined}
          autoComplete={props.autocomplete}
          characterLimit={characterLimit}
        />
        <ComponentValidations bindingPath={simpleBindingField} />
      </Flex>
    </Label>
  );
};
