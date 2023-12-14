import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { Divider, Heading, HelpText, Paragraph } from '@digdir/design-system-react';
import { ConfigIcon } from './ConfigIcon';
import { ConfigDetailsRow } from './ConfigDetailsRow';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigSectionWrapper } from './ConfigSectionWrapper';

export const ConfigContent = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails } = useBpmnContext();

  const configTitle = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText = t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

  return (
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
          <Paragraph size='small'>{configHeaderHelpText}</Paragraph>
        </HelpText>
      </div>
      <Divider />
      <ConfigSectionWrapper>
        <ConfigDetailsRow
          title={t('process_editor.configuration_panel_id_label')}
          text={bpmnDetails.id}
        />
        <ConfigDetailsRow
          title={t('process_editor.configuration_panel_name_label')}
          text={bpmnDetails.name}
        />
      </ConfigSectionWrapper>
    </>
  );
};
