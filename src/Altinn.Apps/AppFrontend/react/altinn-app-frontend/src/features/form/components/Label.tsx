import * as React from 'react';
import { Grid } from '@material-ui/core';
import { getLanguageFromKey } from 'altinn-shared/utils';
import HelpTextIcon from './HelpTextIcon';

export interface IFormLabelProps {
  type: string;
  labelText: string;
  id: string;
  language: any;
  required: boolean;
  helpTextProps: any;
}

export default function Label(props: IFormLabelProps) {

  const noLabelComponents: string[] = ['Header', 'Paragraph', 'Submit', 'ThirdParty', 'AddressComponent', 'Button'];
  const {helpIconRef, openPopover, toggleClickPopover, toggleKeypressPopover} = props.helpTextProps;
  if (noLabelComponents.includes(props.type) || !props.labelText)
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
      <Grid item={true}>
        <label className='a-form-label title-label' htmlFor={props.id}>
          {props.labelText}
          {props.required ? null :
            <span className='label-optional'>
              ({getLanguageFromKey('general.optional', props.language)})
            </span>
          }
          {!!helpIconRef &&
            renderHelpTextIcon()
          }
        </label>
      </Grid>
  );
}