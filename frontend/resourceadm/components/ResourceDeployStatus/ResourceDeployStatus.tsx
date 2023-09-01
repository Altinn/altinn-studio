import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon } from '@navikt/aksel-icons';
import type { DeployError, NavigationBarPage } from 'resourceadm/types/global';
import { Alert, Paragraph } from '@digdir/design-system-react';
import { LinkButton } from '../LinkButton';

export type ResourceDeployStatusProps = {
  /**
   * Title to display on the card
   */
  title: string;
  /**
   * Either list of error object with message and the page to navigate to, or a string message
   */
  error: DeployError[] | string;
  /**
   * Flag for if it is success or alert
   */
  isSuccess?: boolean;
  /**
   * Function that navigates to the page with error
   * @param page the page to navigate to
   * @returns void
   */
  onNavigateToPageWithError?: (page: NavigationBarPage) => void;
  /**
   * The id of the resource
   */
  resourceId: string;
};

/**
 * @component
 *    Displays a red danger card or a green success card, as well as a message
 *
 * @property {string}[title] - Title to display on the card
 * @property {DeployError[] | string}[error] - Either list of error object with message and the page to navigate to, or a string message
 * @property {boolean}[isSuccess] - Flag for if it is success or alert
 * @property {function}[onNavigateToPageWithError] - Function that navigates to the page with error
 * @property {string}[resourceId] - The id of the resource
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceDeployStatus = ({
  title,
  error,
  isSuccess = false,
  onNavigateToPageWithError,
  resourceId,
}: ResourceDeployStatusProps): React.ReactNode => {
  /**
   * Display the different errors based on the type of the error
   */
  const DisplayErrors = () => {
    if (typeof error === 'string') {
      return (
        <div className={classes.cardElement}>
          <ArrowRightIcon fontSize='1.5rem' />
          <Paragraph size='small' className={classes.text}>
            {error}
          </Paragraph>
        </div>
      );
    }
    return error.map((e, index) => {
      const [leftOfLinkText, linkText, rightOfLinkText] = e.message.split('\'')

      return (
        <div className={classes.cardElement} key={index + resourceId}>
          <ArrowRightIcon title={e.message} fontSize='1.5rem' />
          <Paragraph size='small' className={classes.text}>
            {leftOfLinkText + ' "'}
            <LinkButton onClick={() => onNavigateToPageWithError(e.pageWithError)}>
              {linkText}
            </LinkButton>
            {'"' + rightOfLinkText}
          </Paragraph>
        </div>
      );
    });
  };

  const DisplayContent = () => {
    if (isSuccess) {
      return <p className={classes.text}>{title}</p>;
    }
    return (
      <>
        <p className={classes.title}>{title}</p>
        <DisplayErrors />
      </>
    );
  };

  return (
    <Alert severity={isSuccess ? 'success' : 'danger'}>
      <DisplayContent />
    </Alert>
  )
};
