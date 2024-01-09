import React from 'react';
import classes from './ResourceDeployStatus.module.css';
import { ArrowRightIcon } from '@studio/icons';
import type { NavigationBarPage } from 'resourceadm/types/NavigationBarPage';
import type { DeployError } from 'resourceadm/types/DeployError';
import { Alert, Label, Paragraph } from '@digdir/design-system-react';
import { LinkButton } from '../LinkButton';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const getPageToNavigateToAsString = (page: 'about' | 'policy') => {
    switch (page) {
      case 'about':
        return t('resourceadm.about_resource_title');
      case 'policy':
        return t('resourceadm.policy_editor_title');
    }
  };
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
      const [leftOfLinkText] = e.message.split("'");

      return (
        <div className={classes.cardElement} key={index + resourceId}>
          <ArrowRightIcon title={e.message} fontSize='1.5rem' />
          <Paragraph size='small' className={classes.text}>
            {leftOfLinkText + ' "'}
            <LinkButton onClick={() => onNavigateToPageWithError(e.pageWithError)}>
              {getPageToNavigateToAsString(e.pageWithError)}
            </LinkButton>
            {'".'}
          </Paragraph>
        </div>
      );
    });
  };

  const DisplayContent = () => {
    if (isSuccess) {
      return <Paragraph className={classes.text}>{title}</Paragraph>;
    }
    return (
      <>
        <Label size='small' as='p' className={classes.title}>
          {title}
        </Label>
        <DisplayErrors />
      </>
    );
  };

  return (
    <Alert severity={isSuccess ? 'success' : 'danger'}>
      <DisplayContent />
    </Alert>
  );
};
