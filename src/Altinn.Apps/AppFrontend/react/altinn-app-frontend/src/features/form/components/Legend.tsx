/* eslint-disable react/prop-types */
import * as React from 'react';
import { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import Description from './Description';
import { insertHelpIconInNested, checkIfIcon } from '../../../../src/utils/replaceIcon';
import { ILanguage } from 'altinn-shared/types';
import { ITextResourceBindings } from 'src/features/form/layout';
import { HelpTextContainer } from './HelpTextContainer';


export interface IFormLegendProps {
  labelText: string;
  descriptionText: string;
  language: ILanguage;
  required?: boolean;
  labelSettings?: ILabelSettings;
  helpText: string;
  id: string;
  getTextResource: (key: string) => string;
  getTextResourceAsString: (resourceKey: string) => string;
  textResourceBindings: ITextResourceBindings;
}

export default function Legend(props: IFormLegendProps) {
  if (!props.labelText) {
    return null;
  }

  let hasPattern = false;
  hasPattern = checkIfIcon(props.getTextResourceAsString(props.textResourceBindings.title));

  insertHelpIconInNested({
    element: props.labelText,
    language: props.language,
    id: props.id,
    text: props.helpText,
    hasPattern
  });
  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {props.labelText}
        {props.textResourceBindings.help && !hasPattern && <HelpTextContainer language={props.language} id={props.id} helpText={props.getTextResource(props.textResourceBindings.help)} />}
        {(props.labelSettings?.optionalIndicator === false || props.required) ?
          null
          :
          <span className='label-optional'>
            {` (${getLanguageFromKey('general.optional', props.language)})`}
          </span>
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
