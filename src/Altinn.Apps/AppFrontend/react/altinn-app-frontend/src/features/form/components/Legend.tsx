/* eslint-disable react/prop-types */
import * as React from 'react';
import { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import Description from './Description';
import { HelpTextContainer } from './HelpTextContainer';
import { insertHelpIconInText } from '../../../../src/utils/replaceIcon';
export interface IFormLegendProps {
  labelText: string;
  descriptionText: string;
  language: any;
  required?: boolean;
  labelSettings?: ILabelSettings;
  helpText: string;
  id: string;
}

export default function Legend(props: IFormLegendProps) {
  if (!props.labelText) {
    return null;
  }

  var textArr;
  textArr = props.labelText;
  insertHelpIconInText (textArr, props.language, props.id, props.helpText);

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
            ({getLanguageFromKey('general.optional', props.language)})
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
