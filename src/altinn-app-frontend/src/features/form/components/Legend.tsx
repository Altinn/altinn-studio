import React from 'react';
import type { ILabelSettings } from 'src/types';
import { LayoutStyle } from 'src/types';
import Description from './Description';
import { HelpTextContainer } from './HelpTextContainer';
import type { ILanguage } from 'altinn-shared/types';
import { RequiredIndicator } from './RequiredIndicator';
import { OptionalIndicator } from './OptionalIndicator';

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

export default function Legend(props: IFormLegendProps) {
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
          {...props}
        />
      )}
    </>
  );
}
