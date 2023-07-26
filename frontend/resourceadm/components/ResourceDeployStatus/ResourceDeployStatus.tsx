import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon, CheckmarkCircleIcon, ExternalLinkIcon } from '@navikt/aksel-icons';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { LinkButton } from '../LinkButton';

export interface DeployErrorType {
  message: string;
  pageWithError: 'about' | 'policy';
}

interface Props {
  title: string;
  error: DeployErrorType[] | string;
  isSuccess?: boolean;
  onNavigateToPageWithError?: (page: NavigationBarPageType) => void;
  resourceId: string;
}

/**
 * Displays a red danger card or a green success card, as well as a message
 *
 * @param props.title title to display on the card
 * @param error either list of error object with message and the page to navigate to, or a string message
 */
export const ResourceDeployStatus = ({
  title,
  error,
  isSuccess = false,
  onNavigateToPageWithError,
  resourceId,
}: Props) => {
  /**
   * Display the different errors based on the type of the error
   */
  const displayErrors = () => {
    if (typeof error === 'string') {
      return (
        <div className={classes.cardElement}>
          <ArrowRightIcon title={error} fontSize='1.5rem' />
          <p className={classes.text}>{error}</p>
        </div>
      );
    }
    return error.map((e, index) => (
      <div className={classes.cardElement} key={index + resourceId}>
        <ArrowRightIcon title={e.message} fontSize='1.5rem' />
        <p className={classes.text}>{e.message}</p>
        <LinkButton
          text='Fikse det'
          icon={<ExternalLinkIcon title='Gå til siden med feilen' fontSize='1.2rem' />}
          onClick={() => onNavigateToPageWithError(e.pageWithError)}
        />
      </div>
    ));
  };

  const displayContent = () => {
    if (isSuccess) {
      return (
        <>
          <CheckmarkCircleIcon className={classes.successIcon} title={title} fontSize='1.5rem' />
          <p className={classes.text}>{title}</p>
        </>
      );
    }
    return (
      <>
        <p className={classes.title}>{title}</p>
        {displayErrors()}
      </>
    );
  };

  return (
    <div className={`${isSuccess ? classes.success : classes.error} ${classes.card}`}>
      {displayContent()}
    </div>
  );
};
