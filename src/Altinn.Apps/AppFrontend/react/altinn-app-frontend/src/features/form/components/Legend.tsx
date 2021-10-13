/* eslint-disable react/prop-types */
import * as React from 'react';
import { ILabelSettings } from 'src/types';
import { getLanguageFromKey } from 'altinn-shared/utils';
import Description from './Description';
import { HelpTextContainer } from './HelpTextContainer';

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

  var text;
  var placeIconTrue;
  
  if(props.labelText[0]['props']['children'][0]['props'] == null) {
    text = props.labelText[0]['props']['children'][0].toString();
    placeIconTrue = text.indexOf('{help}');
  } else {
    text = props.labelText[0]['props']['children'][0]['props']['children'][0].toString();
    placeIconTrue = text.indexOf('{help}');    
  }
  console.log(props.labelText[0]['props']['children']);
  console.log(text);
  console.log(placeIconTrue);

  if(placeIconTrue !== -1 && props.helpText) {
    var first = text.substring(0, placeIconTrue);
    var last = text.substring(placeIconTrue + 6, text.length);
  }

  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {placeIconTrue === -1 && props.labelText}
        {(props.labelSettings?.optionalIndicator === false || props.required) ?
          null
          :
          <span className='label-optional'>
            ({getLanguageFromKey('general.optional', props.language)})
          </span>
        }
        {placeIconTrue !== -1 && first}
        {props.helpText &&
          <HelpTextContainer
            language={props.language}
            id={props.id}
            helpText={props.helpText}
          />
        }
        {placeIconTrue !== -1 && last}
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
