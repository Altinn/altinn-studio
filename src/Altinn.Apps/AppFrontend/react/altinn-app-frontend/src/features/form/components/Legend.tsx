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
  var labelTextArr;
  var idxHelp;
  var startPos;
  
  if(props.labelText[0]['props']['children'][0]['props'] == null) {

    labelTextArr = props.labelText[0]['props']['children'];

    for(var i=0; i<props.labelText[0]['props']['children'].length; i++) {

      text = props.labelText[0]['props']['children'][i].toString();
      placeIconTrue = text.indexOf('{help}');

      if(placeIconTrue !== -1) {
        idxHelp = i;
        startPos = placeIconTrue;
      }
    }
  } else {
      labelTextArr = props.labelText[0]['props']['children'][0]['props']['children'];
      for(var i=0; i<props.labelText[0]['props']['children'][0]['props']['children'].length; i++) {

        text = props.labelText[0]['props']['children'][0]['props']['children'][0].toString();
        placeIconTrue = text.indexOf('{help}'); 

        if(placeIconTrue !== -1) {
          idxHelp = i;
          startPos = placeIconTrue;
        }
      }
  }

  return (
    <>
      <label
        className='a-form-label title-label'
        htmlFor={props.id}
      >
        {placeIconTrue === -1 && labelTextArr.slice(0,idxHelp)}
        {labelTextArr[idxHelp].substring(0,startPos)}
        {(props.labelSettings?.optionalIndicator === false || props.required) ?
          null
          :
          <span className='label-optional'>
            ({getLanguageFromKey('general.optional', props.language)})
          </span>
        }
        {props.helpText &&
          <HelpTextContainer
            language={props.language}
            id={props.id}
            helpText={props.helpText}
          />
        }
        {labelTextArr[idxHelp].substring(startPos + 6)}
        {placeIconTrue === -1 && labelTextArr.slice(idxHelp + 1)}
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
