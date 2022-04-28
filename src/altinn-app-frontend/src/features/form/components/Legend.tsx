/* eslint-disable react/prop-types */
import * as React from 'react';
import { ILabelSettings } from 'src/types';
import Description from './Description';
import { HelpTextContainer } from './HelpTextContainer';
import { ILanguage } from 'altinn-shared/types';
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
}

export default function Legend(props: IFormLegendProps) {
  if (!props.labelText) {
    return null;
  }

  const shouldShowRequired = props.required;
  const shouldShowOptional = props.labelSettings?.optionalIndicator && !props.required

  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {props.labelText}
          {shouldShowRequired &&
            <RequiredIndicator />
          }
          {shouldShowOptional &&
            <OptionalIndicator />
          }
        {props.helpText &&
          <HelpTextContainer
            language={props.language}
            helpText={props.helpText}
          />
        }
      </label>
      {props.descriptionText &&
        <Description
          description={props.descriptionText}
          {...props}
        />
      }
    </>
  );
}
