import React from 'react';
import classes from './MigrationStep.module.css';
import { Alert, Paragraph, Label } from '@digdir/design-system-react';
import { NavigationBarPageType } from 'resourceadm/types/global';
import { LinkButton } from '../LinkButton';

interface Props {
  /**
   * Title of the field
   */
  title: string;
  /**
   * Text to display inside the Alert
   */
  text: string;
  /**
   * Flag for if the alert is green or not
   */
  isSuccess: boolean;
  /**
   * Function that navigates to the page with error
   */
  onNavigateToPageWithError: (page: NavigationBarPageType) => void;
  /**
   * Page to navigate to if there is an error
   */
  page: NavigationBarPageType;
}

/**
 * @component
 *    Displays the different steps on the migration page together with an alert
 *    indicating if the step is success or warning.
 *
 * @example
 *    <MigrationStep
 *        title='Some title'
 *        text='Some text'
 *        isSuccess={isSuccess}
 *        onNavigateToPageWithError={navigateToPageWithError}
 *        page='about'
 *     />
 *
 * @property {string}[title] - Title of the field
 * @property {string}[text] - Text to displa inside the Alert
 * @property {boolean}[isSuccess] - Flag for if the alert is green or not
 * @property {function}[onNavigateToPageWithError] - Function that navigates to the page with error
 * @property {NavigationBarPageType}[page] - Page to navigate to if there is an error
 *
 * @returns {React.ReactNode} - The rendered Migration Step with text and alert
 */
export const MigrationStep = ({
  title,
  text,
  isSuccess,
  onNavigateToPageWithError,
  page,
}: Props): React.ReactNode => {
  const displayText = () => {
    if (!isSuccess) {
      const textArr = text.split('"');

      return (
        <Paragraph size='small' className={classes.text}>
          {textArr[0] + ' "'}
          <LinkButton text={textArr[1]} onClick={() => onNavigateToPageWithError(page)} />
          {'" ' + textArr[2]}
        </Paragraph>
      );
    }
    return <Paragraph size='small'>{text}</Paragraph>;
  };

  return (
    <div className={classes.wrapper}>
      <Label size='medium' spacing>
        {title}
      </Label>
      <Alert severity={isSuccess ? 'success' : 'danger'} iconTitle={text} className={classes.alert}>
        {displayText()}
      </Alert>
    </div>
  );
};
