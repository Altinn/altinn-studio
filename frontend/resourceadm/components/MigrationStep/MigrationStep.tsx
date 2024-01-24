import React from 'react';
import classes from './MigrationStep.module.css';
import { Alert, Paragraph, Label } from '@digdir/design-system-react';
import type { NavigationBarPage } from '../../types/NavigationBarPage';
import { LinkButton } from '../LinkButton';

type MigrationStepProps = {
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
  onNavigateToPageWithError: (page: NavigationBarPage) => void;
  /**
   * Page to navigate to if there is an error
   */
  page: NavigationBarPage;
};

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
 * @property {NavigationBarPage}[page] - Page to navigate to if there is an error
 *
 * @returns {React.JSX.Element} - The rendered Migration Step with text and alert
 */
export const MigrationStep = ({
  title,
  text,
  isSuccess,
  onNavigateToPageWithError,
  page,
}: MigrationStepProps): React.JSX.Element => {
  const displayText = () => {
    if (!isSuccess) {
      const textArr = text.split('"');

      return (
        <Paragraph size='small' className={classes.text}>
          {textArr[0] + ' "'}
          <LinkButton onClick={() => onNavigateToPageWithError(page)}>{textArr[1]}</LinkButton>
          {'" ' + textArr[2]}
        </Paragraph>
      );
    }
    return <Paragraph size='small'>{text}</Paragraph>;
  };

  return (
    <div className={classes.wrapper}>
      <Label as='p' size='medium' spacing>
        {title}
      </Label>
      <Alert severity={isSuccess ? 'success' : 'danger'} iconTitle={text} className={classes.alert}>
        {displayText()}
      </Alert>
    </div>
  );
};
