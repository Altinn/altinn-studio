import React from 'react';
import classes from './PropertiesHeader.module.css';
import { Divider, Heading, HelpText } from '@digdir/design-system-react';
import { useFormContext } from '../../../containers/FormContext';

type PropertiesHeaderProps = {};

export const PropertiesHeader = ({}: PropertiesHeaderProps): React.JSX.Element => {
  const { formId, form } = useFormContext();
  console.log('FORM ID', formId);
  console.log('FORM', form);

  // getComponentHelperTextByComponentType

  return (
    <div className={classes.wrapper}>
      <div className={classes.header}>
        <div className={classes.iconAndTextWrapper}>
          <p>Icon</p>
          <Heading size='xxsmall' level={2}>
            component name
          </Heading>
        </div>
        <HelpText size='medium' title='TODO'>
          CONTENT
        </HelpText>
      </div>
      <Divider />
      <div className={classes.content}>
        <div className={classes.contentRow}>
          <p>icon</p>
        </div>
        <div className={classes.contentRow}></div>
      </div>
    </div>
  );
};
