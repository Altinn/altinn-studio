import React from 'react';

import classes from './ConfigPanel.module.css';
import { useTranslation } from 'react-i18next';
import { Divider, Heading, HelpText, Label, Paragraph } from '@digdir/design-system-react';
import { useBpmnContext } from '../../contexts/BpmnContext';
import { ConfigIcon } from './ConfigIcon';
import { BpmnTaskType } from '../../types/BpmnTaskType';

/**
 * @component
 *  Displays the configuration panel area of the ProcessEditor
 *
 * @returns {JSX.Element} - The rendered component
 */
export const ConfigPanel = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  console.log('bpmnDetails', bpmnDetails);

  const configTitle = t(getConfigTitle(bpmnDetails?.taskType ?? null));

  const configHeaderHelpText = t(getConfigTitleHelpText(bpmnDetails?.taskType));

  return (
    <div className={classes.configPanel}>
      {bpmnDetails === null ? (
        <Paragraph className={classes.configPanelNotSelectedText} size='small'>
          {configTitle}
        </Paragraph>
      ) : (
        // TODO - Maybe move below to own component
        <>
          <div className={classes.headerWrapper}>
            <div className={classes.headerTextAndIconWrapper}>
              <ConfigIcon taskType={bpmnDetails.taskType} />
              <Heading level={2} size='xsmall'>
                {configTitle}
              </Heading>
            </div>
            <HelpText
              size='medium'
              title={t('process_editor.configuration_panel_header_help_text_title')}
            >
              {configHeaderHelpText}
            </HelpText>
          </div>
          <Divider />
          <div
            style={{ marginInline: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* TODO - Make smaller component of this reusable thing - ADD TRANS */}
            <LabelAndParagraph label='ID:' text={bpmnDetails.id} />
            <LabelAndParagraph label='Navn:' text={bpmnDetails.name} />
          </div>
          <Divider />
          <p>BPMN DETAILS - {JSON.stringify(bpmnDetails)}</p>
        </>
      )}
    </div>
  );
};

type LabelAndParagraphProps = {
  label: string;
  text: string;
};
const LabelAndParagraph = ({ label, text }: LabelAndParagraphProps): JSX.Element => (
  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
    <Label as='p' size='small'>
      {label}
    </Label>
    <Paragraph size='small'>{text}</Paragraph>
  </div>
);

// TODO move this:
const getConfigTitle = (taskType: BpmnTaskType | null) => {
  switch (taskType) {
    case 'data':
      return 'process_editor.configuration_panel_data_task';
    case 'confirmation':
      return 'process_editor.configuration_panel_confirmation_task';
    case 'feedback':
      return 'process_editor.configuration_panel_feedback_task';
    case 'signing':
      return 'process_editor.configuration_panel_signing_task';
    default:
      return 'process_editor.configuration_panel_no_task';
  }
};

const getConfigTitleHelpText = (taskType: BpmnTaskType) => {
  switch (taskType) {
    case 'data':
      return 'process_editor.configuration_panel_header_help_text_data';
    case 'confirmation':
      return 'process_editor.configuration_panel_header_help_text_confirmation';
    case 'feedback':
      return 'process_editor.configuration_panel_header_help_text_feedback';
    case 'signing':
      return 'process_editor.configuration_panel_header_help_text_signing';
  }
};
