import React from 'react';
import { Trans } from 'react-i18next';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon } from '@studio/icons';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import type { DeployError } from '../../types/DeployError';
import { Alert, Label, Paragraph } from '@digdir/design-system-react';
import { LinkButton } from '../LinkButton';

export type ResourceDeployStatusProps = {
  /**
   * Title to display on the card
   */
  title: string;
  /**
   * Either list of error object with message and the page to navigate to
   */
  error: DeployError[];
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
 * @property {DeployError[]}[error] - Either list of error object with message and the page to navigate to
 * @property {boolean}[isSuccess] - Flag for if it is success or alert
 * @property {function}[onNavigateToPageWithError] - Function that navigates to the page with error
 * @property {string}[resourceId] - The id of the resource
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceDeployStatus = ({
  title,
  error,
  isSuccess = false,
  onNavigateToPageWithError,
  resourceId,
}: ResourceDeployStatusProps): React.JSX.Element => {
  return (
    <Alert severity={isSuccess ? 'success' : 'danger'}>
      <Label size='small' asChild className={classes.title}>
        <p>{title}</p>
      </Label>
      {error.map((errorItem, index) => {
        return (
          <div className={classes.cardElement} key={index + resourceId}>
            <ArrowRightIcon fontSize='1.5rem' />
            <Paragraph size='small' className={classes.text}>
              <Trans i18nKey={errorItem.message} values={{ num: errorItem.numberOfErrors }}>
                <LinkButton onClick={() => onNavigateToPageWithError(errorItem.pageWithError)} />
              </Trans>
            </Paragraph>
          </div>
        );
      })}
    </Alert>
  );
};
