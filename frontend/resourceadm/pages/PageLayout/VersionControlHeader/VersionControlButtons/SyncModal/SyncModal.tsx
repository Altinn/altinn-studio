import React, { useState } from 'react';
import { Popover } from '@mui/material';
import classNames from 'classnames';
import classes from './SyncModal.module.css';
import { Button, TextArea } from '@digdir/design-system-react';
import { SimpleContainer } from 'app-shared/primitives';
import { AltinnSpinner } from 'app-shared/components';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';

export interface ISyncModalComponentProps {
  anchorEl: Element;
  header?: string;
  descriptionText?: string[];
  isLoading?: boolean;
  shouldShowDoneIcon?: boolean;
  btnText?: string;
  shouldShowCommitBox?: boolean;
  handleClose: any;
  btnMethod?: any;
}

export const SyncModal = (props: ISyncModalComponentProps) => {
  const [commitMessage, setCommitMessage] = useState('');
  const handleClose = () => {
    setCommitMessage('');
    props.handleClose();
  };

  const btnClickedHandler = () => {
    if (props.btnMethod) {
      props.btnMethod(commitMessage);
    }
  };

  const handleChange = (event: any) => setCommitMessage(event.target.value);

  const open = Boolean(props.anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={props.anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      anchorReference='anchorEl'
    >
      <SimpleContainer className={classes.popover}>
        {props.header && <h3 className={classNames(classes.header)}>{props.header}</h3>}
        {!props.isLoading && !props.shouldShowDoneIcon && (
          <div className={classNames(classes.subHeader)}>
            {props.descriptionText.map((text: any, index: any) => {
              return props.descriptionText.length - 1 !== index ? (
                <span key={index}> {`${text}\n\n`} </span>
              ) : (
                <span key={index}>{text}</span>
              );
            })}
          </div>
        )}
        {props.isLoading && <AltinnSpinner className={classNames(classes.spinner)} />}
        {props.shouldShowDoneIcon && (
          <div className={classNames(classes.doneLoadingIcon)}>
            <i className={classNames('fa fa-circlecheck')} />
          </div>
        )}
        {props.shouldShowCommitBox && (
          <>
            <TextArea
              value={commitMessage}
              rows={4}
              onChange={handleChange}
              aria-labelledby='commit-box'
            />
            <ScreenReaderSpan id='commit-box' label='Bokd for å commite endringer' />
          </>
        )}

        {props.btnText && (
          <Button
            variant='filled'
            color='primary'
            className={classes.button}
            onClick={btnClickedHandler}
            id='share_changes_modal_button'
          >
            {props.btnText}
          </Button>
        )}
      </SimpleContainer>
    </Popover>
  );
};
