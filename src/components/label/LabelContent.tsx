import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Description } from 'src/components/form/Description';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useFormComponentCtx } from 'src/layout/FormComponentContext';
import type { ILabelSettings } from 'src/layout/common.generated';

export type LabelContentProps = Readonly<{
  labelId: string;
  label?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
  labelSettings?: ILabelSettings;
}> & { className?: string };

export function LabelContent({
  labelId,
  label,
  description,
  required,
  readOnly,
  help,
  labelSettings,
  className,
}: LabelContentProps) {
  const { overrideDisplay } = useFormComponentCtx() || {};
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
            id={`${labelId}-helptext`}
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
          key={`description-${labelId}`}
          description={<Lang id={description} />}
        />
      )}
    </span>
  );
}
