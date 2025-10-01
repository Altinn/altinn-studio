import React, { forwardRef } from 'react';

import cn from 'classnames';

import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getDescriptionId } from 'src/components/label/Label';
import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import type { ILabelSettings } from 'src/layout/common.generated';

export type LabelContentProps = Readonly<{
  id: string;
  label?: React.ReactNode;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
  labelSettings?: ILabelSettings;
}> & { className?: string };

export const LabelContent = forwardRef<HTMLSpanElement, LabelContentProps>(function LabelContent(
  { id, label, description, required, readOnly, help, labelSettings, className },
  ref,
) {
  const { overrideDisplay } = useFormComponentCtx() ?? {};
  const { elementAsString } = useLanguage();

  if (overrideDisplay?.renderLabel === false) {
    return null;
  }

  return (
    <span
      className={cn(classes.labelWrapper, className)}
      ref={ref}
    >
      <span className={classes.labelContainer}>
        <span className={classes.labelContent}>
          {typeof label === 'string' ? <Lang id={label} /> : label}
          <RequiredIndicator required={required} />
          <OptionalIndicator
            readOnly={readOnly}
            required={required}
            showOptionalMarking={!!labelSettings?.optionalIndicator}
          />
        </span>
        {help && (
          <HelpTextContainer
            id={id}
            helpText={<Lang id={help} />}
            title={typeof label === 'string' ? label : elementAsString(label)}
          />
        )}
      </span>
      {description && (
        <Description
          className={classes.description}
          componentId={id}
          key={getDescriptionId(id)}
          description={<Lang id={description} />}
        />
      )}
    </span>
  );
});
