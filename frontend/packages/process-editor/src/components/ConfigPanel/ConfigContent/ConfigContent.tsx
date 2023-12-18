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
import { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';

export const ConfigContent = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails, applicationMetadata } = useBpmnContext();

  console.log('applicationMetadata', applicationMetadata);

  const allDataTypes: string[] = getValidDataTypeIds(applicationMetadata);
  console.log('allDataTypes', allDataTypes);
  const showCreateDatamodelLink: boolean = allDataTypes.length === 0;
  // TODO useState for selected and not selected

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
        {showCreateDatamodelLink ? (
          <div className={classes.datamodelLinkWrapper}>
            <LinkIcon className={classes.linkIcon} />
            {/* TODO - FIX href */}
            <Link href={'/datamodel'}>{t('process_editor.create_new_datamodel_link')}</Link>
          </div>
        ) : (
          <Select
            label={t('process_editor.select_datamodel_label')}
            options={[]}
            onChange={() => {}}
            value={[]}
            multiple
          />
        )}
      </ConfigSectionWrapper>
    </>
  );
};
// TODO move
const getValidDataTypeIds = (applicationMetadata: ApplicationMetadata): string[] => {
  if (!applicationMetadata.dataTypes) return [];

  const dataTypesWithoutRefDataAsPdf: DataTypeElement[] = filterOutRefDataAsPdf(
    applicationMetadata.dataTypes,
  );

  if (dataTypesWithoutRefDataAsPdf.length === 0) return [];

  return mapDataTypesToDataTypeIds(dataTypesWithoutRefDataAsPdf);
};

const filterOutRefDataAsPdf = (dataTypes: DataTypeElement[]): DataTypeElement[] => {
  return dataTypes.filter((dataType: DataTypeElement) => dataType.id !== 'ref-data-as-pdf');
};

const mapDataTypesToDataTypeIds = (dataTypes: DataTypeElement[]): string[] =>
  dataTypes.map((dataType: DataTypeElement) => dataType.id);
