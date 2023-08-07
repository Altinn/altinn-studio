import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon } from '@navikt/aksel-icons';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { LinkButton } from '../LinkButton';
import { Alert, Paragraph } from '@digdir/design-system-react';

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
 * @param props.error either list of error object with message and the page to navigate to, or a string message
 * @param props.isSuccess flag for if it is success or alert
 * @param props.onNavigateToPageWithError function that navigates to the page with error
 * @param props.resourceId the id of the resource
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
          <Paragraph size='small' className={classes.text}>
            {error}
          </Paragraph>
        </div>
      );
    }
    return error.map((e, index) => {
      const textArr = e.message.split('"');

      return (
        <div className={classes.cardElement} key={index + resourceId}>
          <ArrowRightIcon title={e.message} fontSize='1.5rem' />
          <Paragraph size='small' className={classes.text}>
            {textArr[0] + ' "'}
            <LinkButton
              text={textArr[1]}
              onClick={() => onNavigateToPageWithError(e.pageWithError)}
            />
            {'"'}
          </Paragraph>
        </div>
      );
    });
  };

  const displayContent = () => {
    if (isSuccess) {
      return <p className={classes.text}>{title}</p>;
    }
    return (
      <>
        <p className={classes.title}>{title}</p>
        {displayErrors()}
      </>
    );
  };

  return (
    <Alert className={classes.alert} severity={isSuccess ? 'success' : 'danger'}>
      {displayContent()}
    </Alert>
  );
};
