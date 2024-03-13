import React from 'react';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { StudioSectionHeader, StudioToggleableTextfield } from '@studio/components';
import { Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import classes from './ConfigEndEvent.module.css';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { ConfigIcon } from '../ConfigContent/ConfigIcon';

export interface ConfigEndEventProps {
  existingCustomReceiptName: string | undefined;
  onUpdateLayoutSet: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
}

export const ConfigEndEvent = ({
  existingCustomReceiptName,
  onUpdateLayoutSet,
}: ConfigEndEventProps) => {
  const { t } = useTranslation();
  const handleUpdateLayoutSet = (layoutSetIdToUpdate: string, customReceiptId: string) => {
    const customReceiptLayoutSetConfig: LayoutSetConfig = {
      id: customReceiptId,
      tasks: [PROTECTED_TASK_NAME_CUSTOM_RECEIPT],
    };
    onUpdateLayoutSet(layoutSetIdToUpdate, customReceiptLayoutSetConfig);
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
          {existingCustomReceiptName
            ? t('process_editor.configuration_panel_custom_receipt_name')
            : t('process_editor.configuration_panel_custom_receipt_add')}
        </Paragraph>
        <StudioToggleableTextfield
          viewProps={{
            title: t('process_editor.configuration_panel_custom_receipt_add'),
            children: existingCustomReceiptName,
            variant: existingCustomReceiptName ? 'tertiary' : 'secondary',
            fullWidth: true,
          }}
          inputProps={{
            title: t('process_editor.configuration_panel_custom_receipt_add_button_title'),
            icon: <PencilWritingIcon />,
            value: existingCustomReceiptName,
            onBlur: (event) => handleUpdateLayoutSet(existingCustomReceiptName, event.target.value),
            size: 'small',
          }}
        />
      </div>
    </>
  );
};
