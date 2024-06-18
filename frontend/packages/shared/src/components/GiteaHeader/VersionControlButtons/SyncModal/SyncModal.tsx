import React, { useState } from 'react';
import { Popover } from '@mui/material';
import classNames from 'classnames';
import classes from './SyncModal.module.css';
import { LegacyTextArea } from '@digdir/design-system-react';
import { SimpleContainer } from 'app-shared/primitives';
import { StudioButton, StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type SyncModalProps = {
  anchorEl: Element;
  header?: string;
  descriptionText?: string[];
  isLoading?: boolean;
  shouldShowDoneIcon?: boolean;
  btnText?: string;
  shouldShowCommitBox?: boolean;
  handleClose: any;
  btnMethod?: any;
};

const headerId = 'sync-modal-header';

export const SyncModal = ({
  anchorEl,
  header,
  descriptionText,
  isLoading,
  shouldShowDoneIcon,
  btnText,
  shouldShowCommitBox,
  handleClose,
  btnMethod,
}: SyncModalProps) => {
  const { t } = useTranslation();

  const [commitMessage, setCommitMessage] = useState('');
  const handleClosePopover = () => {
    setCommitMessage('');
    handleClose();
  };

  const btnClickedHandler = () => {
    if (btnMethod) {
      btnMethod(commitMessage);
    }
  };

  const handleChange = (event: any) => setCommitMessage(event.target.value);

  const open = Boolean(anchorEl);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClosePopover}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      anchorReference='anchorEl'
    >
      <SimpleContainer className={classes.popover}>
        {header && (
          <h3 className={classNames(classes.header)} id={headerId}>
            {header}
          </h3>
        )}
        {
          // Text on push button
          !isLoading && !shouldShowDoneIcon && (
            <div className={classNames(classes.subHeader)}>
              {descriptionText.map((text: any, index: any) => {
                return descriptionText.length - 1 !== index ? (
                  <span key={index}> {`${text}\n\n`} </span>
                ) : (
                  <span key={index}>{text}</span>
                );
              })}
            </div>
          )
        }
        {isLoading && (
          <StudioSpinner showSpinnerTitle={false} spinnerTitle={t('sync_modal.loading')} />
        )}
        {shouldShowDoneIcon && (
          <div className={classNames(classes.doneLoadingIcon)}>
            <i className={classNames('fa fa-circlecheck')} />
          </div>
        )}
        {shouldShowCommitBox && (
          <LegacyTextArea
            aria-labelledby={headerId}
            id='test'
            value={commitMessage}
            rows={4}
            onChange={handleChange}
          />
        )}
        {btnText && (
          <StudioButton
            variant='primary'
            color='first'
            onClick={btnClickedHandler}
            id='share_changes_modal_button'
            size='small'
          >
            {btnText}
          </StudioButton>
        )}
      </SimpleContainer>
    </Popover>
  );
};
