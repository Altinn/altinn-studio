import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { Divider, Heading, HelpText, Link, Paragraph, Select } from '@digdir/design-system-react';
import { ConfigIcon } from './ConfigIcon';
import { ConfigDetailsRow } from './ConfigDetailsRow';
import { getConfigTitleKey, getConfigTitleHelpTextKey } from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { ConfigSectionWrapper } from './ConfigSectionWrapper';
import { LinkIcon } from '@studio/icons';

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
      <ConfigSectionWrapper>
        {/*
          IF Datamodel exists, show drop down with models
          ELSE show LINK to Datamodel page
        */}
        {1 === 2 ? (
          <Select
            label={t('process_editor.select_datamodel_label')}
            options={[]}
            onChange={() => {}}
            value={''}
          />
        ) : (
          <div className={classes.datamodelLinkWrapper}>
            <LinkIcon className={classes.linkIcon} />
            {/* TODO - FIX href */}
            <Link href={'/datamodel'}>{t('process_editor.create_new_datamodel_link')}</Link>
          </div>
        )}
      </ConfigSectionWrapper>
    </>
  );
};

/**
 *           options={authLevelOptionKeysAsDisplayStrings}
          onChange={(authLevel: RequiredAuthLevel) => onSave(authLevel)}
          value={requiredAuthenticationLevelEndUser}
          inputId={SELECT_AUTH_LEVEL_ID}
 */
