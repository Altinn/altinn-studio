import type { ReactNode } from 'react';
import React from 'react';
import classes from './BPMNViewerErrorAlert.module.css';
import type { BpmnViewerError } from '../../../../types/BpmnViewerError';
import { useTranslation } from 'react-i18next';
import { Alert, Heading, Paragraph } from '@digdir/design-system-react';

interface ErrorMessage {
  heading: string;
  body: string;
}

type BPMNViewerErrorAlertProps = {
  bpmnViewerError: BpmnViewerError;
};

/**
 * @component
 *  Displays the bpmn vierwer alert with error
 *
 * @property {BpmnViewerError}[bpmnViewerError] - The error to display
 *
 * @returns {ReactNode} - The rendered component
 */
export const BPMNViewerErrorAlert = ({ bpmnViewerError }: BPMNViewerErrorAlertProps): ReactNode => {
  const { t } = useTranslation();

  const getErrorMessage = (): ErrorMessage | null => {
    if (bpmnViewerError === 'noDiagram') {
      return {
        heading: t('process_editor.not_found_diagram_heading'),
        body: t('process_editor.not_found_diagram_error_message'),
      };
    }
    if (bpmnViewerError === 'noProcess') {
      return {
        heading: t('process_editor.not_found_process_heading'),
        body: t('process_editor.not_found_process_error_message'),
      };
    }
    if (bpmnViewerError === 'unknown') {
      return {
        heading: t('process_editor.unknown_heading_error_message'),
        body: t('process_editor.unknown_paragraph_error_message'),
      };
    }
    return null;
  };

  const errorToDisplay: ErrorMessage = getErrorMessage();

  return (
    <div className={classes.alertContainer}>
      <Alert severity='warning'>
        <Heading size='small' spacing>
          {errorToDisplay.heading}
        </Heading>
        <Paragraph>{errorToDisplay.body}</Paragraph>
      </Alert>
    </div>
  );
};
