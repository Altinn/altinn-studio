import React from 'react';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { StudioSectionHeader, StudioToggleableTextfield } from '@studio/components';
import { Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import classes from './ConfigEndEvent.module.css';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';
import { getLayoutSetIdValidationErrorKey } from 'app-shared/utils/layoutSetsUtils';
import { useBpmnApiContext } from '../../../contexts/BpmnApiContext';

export const ConfigEndEvent = () => {
  const { t } = useTranslation();
  const { layoutSets, existingCustomReceiptLayoutSetName, addLayoutSet, mutateLayoutSet } =
    useBpmnApiContext();

  const handleUpdateLayoutSet = (layoutSetIdToUpdate: string, customReceiptId: string) => {
    if (layoutSetIdToUpdate === customReceiptId || (!layoutSetIdToUpdate && !customReceiptId))
      return;
    const customReceiptLayoutSetConfig: LayoutSetConfig = {
      id: customReceiptId,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    };
    if (!layoutSetIdToUpdate)
      addLayoutSet({ layoutSetIdToUpdate, layoutSetConfig: customReceiptLayoutSetConfig });
    else mutateLayoutSet({ layoutSetIdToUpdate, layoutSetConfig: customReceiptLayoutSetConfig });
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
          text: t('process_editor.configuration_panel_header_help_text_custom_receipt'),
          title: t('process_editor.configuration_panel_header_help_text_title'),
        }}
        className={classes.endEvent}
      />
      <div className={classes.container}>
        <Paragraph size='small'>
          {existingCustomReceiptLayoutSetName
            ? t('process_editor.configuration_panel_custom_receipt_name')
            : t('process_editor.configuration_panel_custom_receipt_add')}
        </Paragraph>
        <StudioToggleableTextfield
          viewProps={{
            title: t('process_editor.configuration_panel_custom_receipt_add'),
            children: existingCustomReceiptLayoutSetName,
            variant: existingCustomReceiptLayoutSetName ? 'tertiary' : 'secondary',
            fullWidth: true,
          }}
          inputProps={{
            title: t('process_editor.configuration_panel_custom_receipt_add_button_title'),
            icon: <PencilWritingIcon />,
            value: existingCustomReceiptLayoutSetName,
            onBlur: ({ target }) =>
              handleUpdateLayoutSet(existingCustomReceiptLayoutSetName, target.value),
            size: 'small',
          }}
          customValidation={(newLayoutSetId: string) => {
            const validationResult = getLayoutSetIdValidationErrorKey(
              layoutSets,
              existingCustomReceiptLayoutSetName,
              newLayoutSetId,
            );
            return validationResult ? t(validationResult) : undefined;
          }}
        />
      </div>
    </>
  );
};
