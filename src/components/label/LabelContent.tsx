import React from 'react';

import { HelpText } from '@digdir/designsystemet-react';
import classNames from 'classnames';

import { Description } from 'src/components/form/Description';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import classes from 'src/components/label/LabelContent.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { useFormComponentCtxStrict } from 'src/layout/FormComponentContext';
import type { ILabelSettings } from 'src/layout/common.generated';

export type LabelContentProps = Readonly<{
  id?: string;
  label?: string;
  description?: string;
  required?: boolean;
  readOnly?: boolean;
  help?: string;
  labelSettings?: ILabelSettings;
  addBottomPadding?: boolean;
}>;

export function LabelContent({
  id,
  label,
  description,
  required,
  readOnly,
  help,
  labelSettings,
  addBottomPadding = true,
}: LabelContentProps) {
  const { overrideDisplay } = useFormComponentCtxStrict();
  const { langAsString } = useLanguage();

  if (overrideDisplay?.renderLabel === false) {
    return null;
  }

  return (
    <span
      id={id}
      className={classNames({ [classes.bottomPadding]: addBottomPadding }, classes.labelWrapper)}
    >
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
            id={`${id}-helptext`}
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
          key={`description-${id}`}
          description={<Lang id={description} />}
          id={id}
        />
      )}
    </span>
  );
}
