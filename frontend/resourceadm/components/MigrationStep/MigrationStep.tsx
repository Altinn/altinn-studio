import React from 'react';
import { Trans } from 'react-i18next';
import { Alert, Paragraph } from '@digdir/designsystemet-react';
import { LinkButton } from '../LinkButton';
import { StudioLabelAsParagraph } from '@studio/components';

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
  onNavigateToPageWithError: () => void;
  /**
   * Translation values for placeholders
   */
  translationValues?: { [key: string]: string | number };
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
 * @property {translationValues}[Object] - Translation values for placeholders
 *
 * @returns {React.JSX.Element} - The rendered Migration Step with text and alert
 */
export const MigrationStep = ({
  title,
  text,
  isSuccess,
  translationValues,
  onNavigateToPageWithError,
}: MigrationStepProps): React.JSX.Element => {
  return (
    <div>
      <StudioLabelAsParagraph size='medium' spacing>
        {title}
      </StudioLabelAsParagraph>
      <Alert severity={isSuccess ? 'success' : 'danger'}>
        <Paragraph size='small'>
          <Trans i18nKey={text} values={translationValues}>
            <LinkButton onClick={onNavigateToPageWithError} />
          </Trans>
        </Paragraph>
      </Alert>
    </div>
  );
};
