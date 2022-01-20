/* eslint-disable react/prop-types */
import * as React from 'react';
import { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import Description from './Description';
import { HelpTextContainer } from './HelpTextContainer';
import { ILanguage } from 'altinn-shared/types';

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

  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {props.labelText}
        {(props.labelSettings?.optionalIndicator === false || props.required) ?
          null
          :
          <span className='label-optional'>
            {` (${getLanguageFromKey('general.optional', props.language)})`}
          </span>
        }
        {props.helpText &&
          <HelpTextContainer
            language={props.language}
            id={props.id}
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
