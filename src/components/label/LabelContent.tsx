import React from 'react';

import cn from 'classnames';

import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getDescriptionId } from 'src/components/label/Label';
import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import type { ILabelSettings } from 'src/layout/common.generated';

export type LabelContentProps = Readonly<{
  componentId: string;
  label?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
  labelSettings?: ILabelSettings;
}> & { className?: string };

export function LabelContent({
  componentId,
  label,
  description,
  required,
  readOnly,
  help,
  labelSettings,
  className,
}: LabelContentProps) {
  const { overrideDisplay } = useFormComponentCtx() ?? {};

  if (overrideDisplay?.renderLabel === false) {
    return null;
  }

  return (
    <span className={cn(classes.labelWrapper, className)}>
      <span className={classes.labelContainer}>
        <span className={classes.labelContent}>
          <Lang id={label} />
          <RequiredIndicator required={required} />
          <OptionalIndicator
            readOnly={readOnly}
            required={required}
            showOptionalMarking={!!labelSettings?.optionalIndicator}
          />
        </span>
        {help && (
          <HelpTextContainer
            id={componentId}
            helpText={<Lang id={help} />}
            title={label}
          />
        )}
      </span>
      {description && (
        <Description
          className={classes.description}
          componentId={componentId}
          key={getDescriptionId(componentId)}
          description={<Lang id={description} />}
        />
      )}
    </span>
  );
}
