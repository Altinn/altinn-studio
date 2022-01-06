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

  var textArr;
  const replacePattern = '{help}';

  function replaceIcon(element, pattern){

    var iconPos;
    
    for(var j=0; j < element.length; j++){
      if(element[j]['props']) {
        if(element[j]['props']['children']) {
          replaceIcon(element[j]['props']['children'], pattern)
        }
      } else {
        iconPos = element[j].indexOf(pattern);
        if(element[j].indexOf(pattern) !== -1) {
            element[j] = 
              <> 
                {element[j].substring(0, iconPos)} 
                  <HelpTextContainer
                    language={props.language}
                    id={props.id}
                    helpText={props.helpText}
                  />
                {element[j].substring(iconPos + replacePattern.length)}
              </>;
        }
      }
    }
  }

  textArr = props.labelText;
  replaceIcon(textArr, replacePattern);

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
