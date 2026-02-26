import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';
import classes from 'nextsrc/libs/form-engine/components/Option.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompOptionExternal } from 'src/layout/Option/config.generated';

export const Option = ({ component }: ComponentProps) => {
  const props = component as CompOptionExternal;
  const { langAsString } = useLanguage();
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const options = useOptions({ options: props.options, optionsId: props.optionsId });

  const rawValue = typeof props.value === 'string' ? props.value : '';
  const selectedOption = options.find((opt) => String(opt.value) === rawValue);
  const displayLabel = selectedOption ? langAsString(selectedOption.label) : rawValue;

  const descriptionKey =
    typeof props.textResourceBindings?.description === 'string' ? props.textResourceBindings.description : undefined;
  const description = useTextResource(descriptionKey);

  const direction = props.direction ?? 'horizontal';

  return (
    <div className={`${classes.optionComponent} ${classes[direction]}`}>
      <div className={classes.optionLabelContainer}>
        {title && <label>{title}</label>}
        <span>{displayLabel}</span>
      </div>
      {description && <div className={classes.optionDescription}>{description}</div>}
    </div>
  );
};
