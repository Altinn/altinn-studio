import React from 'react';

import { Description } from 'src/components/form/Description';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import classes from 'src/components/form/Legend.module.css';
import { OptionalIndicator } from 'src/components/form/OptionalIndicator';
import { RequiredIndicator } from 'src/components/form/RequiredIndicator';
import { LayoutStyle } from 'src/types';
import { getPlainTextFromNode } from 'src/utils/stringHelper';
import type { ILabelSettings } from 'src/types';

export interface IFormLegendProps {
  labelText: React.ReactNode;
  descriptionText: React.ReactNode;
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
      <RequiredIndicator required={props.required} />
      <OptionalIndicator
        labelSettings={props.labelSettings}
        required={props.required}
      />
    </>
  );

  if (props.layout === LayoutStyle.Table) {
    return LabelText;
  }

  return (
    <>
      <div className={classes.legendHelpTextContainer}>
        <legend className='a-form-label title-label'>{LabelText}</legend>
        {props.helpText && (
          <HelpTextContainer
            helpText={props.helpText}
            title={getPlainTextFromNode(props.labelText)}
          />
        )}
      </div>
      {props.descriptionText && (
        <Description
          description={props.descriptionText}
          id={props.id}
        />
      )}
    </>
  );
}
