import React from 'react';
import { Trans } from 'react-i18next';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon } from '@studio/icons';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import type { DeployError } from '../../types/DeployError';
import { LinkButton } from '../LinkButton';
import { StudioAlert, StudioHeading, StudioParagraph } from '@studio/components';

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
    <StudioAlert data-color={isSuccess ? 'success' : 'danger'}>
      <StudioHeading data-size='2xs' level={2} className={classes.title}>
        {title}
      </StudioHeading>
      {error.map((errorItem, index) => {
        return (
          <div className={classes.cardElement} key={index + resourceId}>
            <ArrowRightIcon fontSize='1.5rem' />
            <StudioParagraph className={classes.text}>
              <Trans i18nKey={errorItem.message} values={{ num: errorItem.numberOfErrors }}>
                <LinkButton onClick={onNavigateToPageWithError} page={errorItem.pageWithError} />
              </Trans>
            </StudioParagraph>
          </div>
        );
      })}
    </StudioAlert>
  );
};
