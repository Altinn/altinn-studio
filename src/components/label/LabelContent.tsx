import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Description } from 'src/components/form/Description';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { getDescriptionId } from 'src/components/label/Label';
import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
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
  const { langAsString } = useLanguage();

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
            labelSettings={labelSettings}
            readOnly={readOnly}
            required={required}
          />
        </span>
        {help && (
          <HelpText
            id={`${componentId}-helptext`}
            title={
              label ? `${langAsString('helptext.button_title_prefix')} ${label}` : langAsString('helptext.button_title')
            }
          >
            <Lang id={help} />
          </HelpText>
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
