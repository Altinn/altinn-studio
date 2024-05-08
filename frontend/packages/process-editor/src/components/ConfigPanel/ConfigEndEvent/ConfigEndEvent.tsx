import React from 'react';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import {
  StudioLabelAsParagraph,
  StudioSectionHeader,
  // StudioToggleableTextfield,
} from '@studio/components';
import { Link, Paragraph } from '@digdir/design-system-react';
// import { PencilWritingIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import classes from './ConfigEndEvent.module.css';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
// import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';
import { AddCustomReceiptForm } from '../AddCustomReceiptForm';
import { type CustomReceipt } from '../../../types/CustomReceipt';
import { type DataTypeChange } from 'app-shared/types/api/DataTypeChange';

export const ConfigEndEvent = () => {
  const { t } = useTranslation();

  const {
    layoutSets,
    existingCustomReceiptLayoutSetId,
    addLayoutSet,
    mutateLayoutSet,
    deleteLayoutSet,
    mutateDataType,
  } = useBpmnApiContext();

  const currentDataModel =
    layoutSets.sets.find((ls) => ls.id === existingCustomReceiptLayoutSetId)?.dataType ?? '';
  console.log('layoutsets', currentDataModel);

  const handleSaveCustomReceipt = (customReceipt: CustomReceipt) => {
    if (existingCustomReceiptLayoutSetId === customReceipt.layoutSetId) return;

    if (!existingCustomReceiptLayoutSetId) {
      handleAddLayoutSet(customReceipt);
      return;
    }
    handleEditCustomReceipt(customReceipt);
  };

  const handleEditCustomReceipt = (customReceipt: CustomReceipt) => {
    mutateLayoutSet(
      {
        layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
        newLayoutSetId: customReceipt.layoutSetId,
      },
      {
        onSettled: () => updateDatamodel(customReceipt.datamodelId),
      },
    );
  };

  const handleAddLayoutSet = (customReceipt: CustomReceipt) => {
    const customReceiptLayoutSetConfig: LayoutSetConfig = {
      id: customReceipt.layoutSetId,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    };
    addLayoutSet(
      {
        layoutSetIdToUpdate: customReceipt.layoutSetId,
        layoutSetConfig: customReceiptLayoutSetConfig,
      },
      {
        onSettled: () => updateDatamodel(customReceipt.datamodelId),
      },
    );
  };

  const updateDatamodel = (datamodelId: string) => {
    console.log('datamodel id', datamodelId);
    const dataTypeChange: DataTypeChange = {
      newDataType: datamodelId,
      connectedTaskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
    };
    mutateDataType(dataTypeChange);
  };

  const handleDeleteCustomReceipt = () => {
    // mutateDataType(undefined);
    deleteLayoutSet({ layoutSetIdToUpdate: existingCustomReceiptLayoutSetId });
  };

  return (
    <>
      <StudioSectionHeader
        icon={<ConfigIcon taskType={'endEvent'} />}
        heading={{
          text: t('process_editor.configuration_panel_end_event'),
          level: 2,
        }}
        helpText={{
          // TODO - SKAL HJELPETEXT VÆRE DER?
          text: t('process_editor.configuration_panel_header_help_text_custom_receipt'),
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
      />
      {/*<Accordion color='subtle'>
        <Accordion.Item>
          <Accordion.Header>Kvittering</Accordion.Header>
      <Accordion.Content>*/}
      <div className={classes.container}>
        <div className={classes.section}>
          <StudioLabelAsParagraph size='small' spacing>
            Standardkvittering
          </StudioLabelAsParagraph>
          <Paragraph size='small' className={classes.paragraph}>
            Det er automatisk satt opp en standardkvittering i appen.
          </Paragraph>
          <Link
            href='https://docs.altinn.studio/app/development/configuration/process/customize/#receipt'
            rel='noopener noreferrer'
            size='small'
          >
            Les mer om standardkvittering i dokumentasjonen
          </Link>
        </div>
        <div className={classes.section}>
          <StudioLabelAsParagraph size='small' spacing>
            Opprett din egen kvittering
          </StudioLabelAsParagraph>
          <Paragraph size='small'>
            Hvis du heller vil lage din egen kvittering, kan du opprette den her. Kvitteringen du
            lager selv vil overstyre standardkvitteringen.
          </Paragraph>

          <AddCustomReceiptForm
            onSaveCustomReceipt={handleSaveCustomReceipt}
            handleDeleteCustomReceipt={handleDeleteCustomReceipt}
          />
        </div>
      </div>
      {/*</Accordion.Content>
        </Accordion.Item>
              </Accordion>*/}

      {/* <div>
        <Paragraph size='small'>
          {existingCustomReceiptLayoutSetId
            ? t('process_editor.configuration_panel_custom_receipt_name')
            : t('process_editor.configuration_panel_custom_receipt_add')}
        </Paragraph>
        <StudioToggleableTextfield
          viewProps={{
            title: t('process_editor.configuration_panel_custom_receipt_add'),
            children: existingCustomReceiptLayoutSetId,
            variant: existingCustomReceiptLayoutSetId ? 'tertiary' : 'secondary',
            fullWidth: true,
          }}
          inputProps={{
            label: t('process_editor.configuration_panel_custom_receipt_add_button_title'),
            icon: <PencilWritingIcon />,
            value: existingCustomReceiptLayoutSetId,
            onBlur: ({ target }) =>
              handleUpdateLayoutSet(existingCustomReceiptLayoutSetId, target.value),
            size: 'small',
          }}
          customValidation={(newLayoutSetId: string) => {
            const validationResult = getLayoutSetIdValidationErrorKey(
              layoutSets,
              existingCustomReceiptLayoutSetId,
              newLayoutSetId,
            );
            return validationResult ? t(validationResult) : undefined;
          }}
        />
        </div>*/}
    </>
  );
};
