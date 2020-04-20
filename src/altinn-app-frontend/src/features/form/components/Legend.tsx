import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import HelpTextIcon from './HelpTextIcon';

export interface IFormLegendProps {
  labelText: string;
  language: any;
  required: boolean;
  helpTextProps: any;
}

export default function Legend(props: IFormLegendProps) {

  const {helpIconRef, openPopover, toggleClickPopover, toggleKeypressPopover} = props.helpTextProps;
  if (!props.labelText)
  {
    return null;
  }

  const renderHelpTextIcon = () => {
    return (
      <span>
        <HelpTextIcon 
          helpIconRef={helpIconRef}
          language={props.language}
          toggleClickPopover={toggleClickPopover}
          toggleKeypressPopover={toggleKeypressPopover}
          openPopover={openPopover}
        />
      </span>
    )
  }

  return (
    <div className='a-form-label title-label'>
      {props.labelText}
      {props.required ? null :
        <span className='label-optional'>
          ({getLanguageFromKey('general.optional', props.language)})
        </span>
      }
      {!!helpIconRef &&
        renderHelpTextIcon()
      }
      </div>
  );
}