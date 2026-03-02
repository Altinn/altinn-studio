import React from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/app-components/Label/Label';
import { useCharacterLimit } from 'src/app-components/Input/Input';
import { TextArea as AppTextArea } from 'src/app-components/TextArea/TextArea';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { asTranslationKey } from 'nextsrc/libs/form-engine/AppComponentsBridge';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components';

import type { CompTextAreaExternal } from 'src/layout/TextArea/config.generated';

export const TextArea = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTextAreaExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);
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
      <Flex item size={{ xs: 12 }}>
        <AppTextArea
          id={props.id}
          ariaLabel={asTranslationKey(titleKey)}
          value={String(value ?? '')}
          onChange={(v) => setValue(v)}
          readOnly={props.readOnly as boolean | undefined}
          autoComplete={props.autocomplete}
          characterLimit={characterLimit}
        />
        <ComponentValidations bindingPath={simpleBinding} />
      </Flex>
    </Label>
  );
};
