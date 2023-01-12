import React, { useState } from 'react';
import { CircularProgress, Popover } from '@mui/material';
import classNames from 'classnames';
import classes from './SyncModal.module.css';
import { TextArea } from '@altinn/altinn-design-system';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { SimpleContainer } from '../primitives';

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
        {props.isLoading && <CircularProgress className={classNames(classes.spinner)} />}
        {props.shouldShowDoneIcon && (
          <div className={classNames(classes.doneLoadingIcon)}>
            <i className={classNames('fa fa-circlecheck')} />
          </div>
        )}
        {props.shouldShowCommitBox && (
          <TextArea id='test' value={commitMessage} rows={4} onChange={handleChange} />
        )}

        {props.btnText && (
          <Button
            variant={ButtonVariant.Filled}
            color={ButtonColor.Primary}
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
