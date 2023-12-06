import React from 'react';

import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import classes from 'src/components/form/Legend.module.css';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { useLanguage } from 'src/features/language/useLanguage';
import { LayoutStyle } from 'src/layout/common.generated';
import type { ILabelSettings } from 'src/layout/common.generated';

export interface IFormLegendProps {
  label: React.ReactNode;
  description: React.ReactNode;
  required?: boolean;
  labelSettings?: ILabelSettings;
  helpText: React.ReactNode;
  id: string;
  layout?: LayoutStyle;
}

export function Legend({ label, required, labelSettings, id, helpText, description, layout }: IFormLegendProps) {
  const { elementAsString } = useLanguage();
  const labelAsText = elementAsString(label);
  if (!label || !labelAsText) {
    return null;
  }

  const LabelText = (
    <>
      {label}
      <RequiredIndicator required={required} />
      <OptionalIndicator
        labelSettings={labelSettings}
        required={required}
      />
    </>
  );

  if (layout === LayoutStyle.Table) {
    return LabelText;
  }

  return (
    <>
      <div className={classes.legendHelpTextContainer}>
        <legend>{LabelText}</legend>
        {helpText && (
          <HelpTextContainer
            helpText={helpText}
            title={labelAsText}
          />
        )}
      </div>
      {description && (
        <Description
          description={description}
          id={id}
        />
      )}
    </>
  );
}
