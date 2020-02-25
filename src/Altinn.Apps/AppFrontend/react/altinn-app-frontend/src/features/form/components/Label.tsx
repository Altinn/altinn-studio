import * as React from 'react';
import { Grid } from '@material-ui/core';
import { getLanguageFromKey } from 'altinn-shared/utils';
import HelpTextIcon from './HelpTextIcon';

export interface IFormLabelProps {
  type: string;
  labelText: string;
  helpText: string;
  id: string;
  language: any;
  required: boolean;
  helpIconRef: React.RefObject<any>
  openPopover: boolean;
  toggleClickPopover: (event: any) => void;
  toggleKeypressPopover: (event: any) => void;
}

export default function Label(props: IFormLabelProps) {

  const noLabelComponents: string[] = ['Header', 'Paragraph', 'Submit', 'ThirdParty', 'AddressComponent', 'Button'];
  if (noLabelComponents.includes(props.type) || !props.labelText)
  {
    return null;
  }
  return (
    <>
      <Grid item={true}>
        <label className='a-form-label title-label' htmlFor={props.id}>
          {props.labelText}
          {props.required ? null :
            <span className='label-optional'>
              ({getLanguageFromKey('general.optional', props.language)})
            </span>
          }
        </label>
      </Grid>
      <Grid item={true}>
        <HelpTextIcon 
          helpIconRef={props.helpIconRef}
          helpTextKey={props.helpText}
          language={props.language}
          toggleClickPopover={props.toggleClickPopover}
          toggleKeypressPopover={props.toggleKeypressPopover}
          openPopover={props.openPopover}
        />
      </Grid>
    </>
  );
}