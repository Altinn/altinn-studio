import React from 'react';
import classes from './ConfigContent.module.css';
import { useTranslation } from 'react-i18next';
import { LinkIcon } from '@studio/icons';
import {
  Divider,
  Heading,
  HelpText,
  Link,
  Paragraph,
  Select,
  MultiSelectOption,
} from '@digdir/design-system-react';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { ConfigIcon } from './ConfigIcon';
import { ConfigDetailsRow } from './ConfigDetailsRow';
import { ConfigSectionWrapper } from './ConfigSectionWrapper';
import {
  getConfigTitleKey,
  getConfigTitleHelpTextKey,
  getSelectedDataTypes,
  getApplicationMetadataWithUpdatedDataTypes,
  getValidDataTypeIdsAndTaskIds,
} from '../../../utils/configPanelUtils';
import { useBpmnContext } from '../../../contexts/BpmnContext';
import { DataTypeIdAndTaskId } from '../../../types/DataTypeIdAndTaskId';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const ConfigContent = (): JSX.Element => {
  const { t } = useTranslation();
  const { bpmnDetails, applicationMetadata, updateApplicationMetadata } = useBpmnContext();
  const { org, app } = useStudioUrlParams();

  const packagesRouter: PackagesRouter = new PackagesRouter({ org, app });

  const validDataTypeIdsAndTaskIds: DataTypeIdAndTaskId[] =
    getValidDataTypeIdsAndTaskIds(applicationMetadata);

  const showCreateDatamodelLink: boolean = validDataTypeIdsAndTaskIds.length === 0;

  const dataTypeOptions: MultiSelectOption[] = validDataTypeIdsAndTaskIds.map(
    (data: DataTypeIdAndTaskId) => ({
      value: data.dataTypeId,
      label: data.dataTypeId,
    }),
  );

  const dataTypeValues: string[] = getSelectedDataTypes(bpmnDetails.id, validDataTypeIdsAndTaskIds);
  const configTitle: string = t(getConfigTitleKey(bpmnDetails?.taskType));
  const configHeaderHelpText: string =
    bpmnDetails?.taskType && t(getConfigTitleHelpTextKey(bpmnDetails?.taskType));

  const updateDataTasksInApplicationMetadata = (taskIds: string[]) => {
    const updatedApplicationMetadata: ApplicationMetadata =
      getApplicationMetadataWithUpdatedDataTypes(applicationMetadata, bpmnDetails.id, taskIds);

    updateApplicationMetadata(updatedApplicationMetadata);
  };

  return (
    <>
      <div className={classes.headerWrapper}>
        <div className={classes.headerTextAndIconWrapper}>
          <ConfigIcon taskType={bpmnDetails.taskType} />
          <Heading level={2} size='xsmall'>
            {configTitle}
          </Heading>
        </div>
        {configHeaderHelpText && (
          <HelpText
            size='medium'
            title={t('process_editor.configuration_panel_header_help_text_title')}
          >
            <Paragraph size='small'>{configHeaderHelpText}</Paragraph>
          </HelpText>
        )}
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
        <div className={classes.headingAndHelpTextWrapper}>
          <Heading level={3} size='xxsmall'>
            {t('process_editor.datatype_label')}
          </Heading>
          <HelpText size='medium' title={t('process_editor.datatype_helptext_title')}>
            <Paragraph size='small'>{t('process_editor.datatype_helptext_content')}</Paragraph>
          </HelpText>
        </div>
        {showCreateDatamodelLink ? (
          <div className={classes.datamodelLinkWrapper}>
            <LinkIcon className={classes.linkIcon} />
            <Link href={packagesRouter.getPackageNavigationUrl('editorDatamodel')}>
              {t('process_editor.create_new_datamodel_link')}
            </Link>
          </div>
        ) : (
          /* TODO - Replace with Combobox when published - Issue: #11891 */
          <Select
            label={t('process_editor.select_datatype_label')}
            hideLabel
            options={dataTypeOptions}
            onChange={updateDataTasksInApplicationMetadata}
            value={dataTypeValues}
            multiple
          />
        )}
      </ConfigSectionWrapper>
    </>
  );
};
