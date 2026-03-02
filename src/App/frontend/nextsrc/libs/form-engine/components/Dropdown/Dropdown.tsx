import React from 'react';

import { Select } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/app-components/Label/Label';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import classes from 'nextsrc/libs/form-engine/components/Dropdown/Dropdown.module.css';
import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompDropdownExternal } from 'src/layout/Dropdown/config.generated';

export const Dropdown = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompDropdownExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);
  const options = useOptions(props);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);
  const isReadOnly = props.readOnly as boolean | undefined;

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
      <Flex item size={{ xs: 12 }} className={cn({ [classes.readOnly]: isReadOnly })}>
        <Select
          id={props.id}
          required={required}
          disabled={isReadOnly}
          value={String(value ?? '')}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value='' />
          {options.map((opt) => (
            <option
              key={String(opt.value)}
              value={String(opt.value)}
            >
              {opt.label}
            </option>
          ))}
        </Select>
        <ComponentValidations bindingPath={simpleBinding} />
      </Flex>
    </Label>
  );
};
