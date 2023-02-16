import React from 'react';

import { Description } from 'src/features/form/components/Description';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { OptionalIndicator } from 'src/features/form/components/OptionalIndicator';
import { RequiredIndicator } from 'src/features/form/components/RequiredIndicator';
import { LayoutStyle } from 'src/types';
import type { ILabelSettings } from 'src/types';
import type { ILanguage } from 'src/types/shared';

export interface IFormLegendProps {
  labelText: React.ReactNode;
  descriptionText: React.ReactNode;
  language: ILanguage;
  required?: boolean;
  labelSettings?: ILabelSettings;
  helpText: React.ReactNode;
  id: string;
  layout?: LayoutStyle;
}

export function Legend(props: IFormLegendProps) {
  if (!props.labelText) {
    return null;
  }
  const LabelText = (
    <>
      {props.labelText}
      <RequiredIndicator
        required={props.required}
        language={props.language}
      />
      <OptionalIndicator
        labelSettings={props.labelSettings}
        language={props.language}
        required={props.required}
      />
      {props.helpText && (
        <HelpTextContainer
          language={props.language}
          helpText={props.helpText}
        />
      )}
    </>
  );

  if (props.layout === LayoutStyle.Table) {
    return LabelText;
  }

  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {LabelText}
      </label>
      {props.descriptionText && (
        <Description
          description={props.descriptionText}
          id={props.id}
        />
      )}
    </>
  );
}
