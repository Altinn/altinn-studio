import React from 'react';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { StudioSectionHeader, StudioToggleableTextfield } from '@studio/components';
import { Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import classes from './CustomReceipt.module.css';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';

export interface CustomReceiptProps {
  existingCustomReceiptName: string | undefined;
  onUpdateLayoutSet: (layoutSetIdToUpdate: string, layoutSetConfig: LayoutSetConfig) => void;
}

export const CustomReceipt = ({
  existingCustomReceiptName,
  onUpdateLayoutSet,
}: CustomReceiptProps) => {
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
        heading={{ text: t('process_editor.configuration_panel_custom_receipt') }}
        helpText={{
          text: t('process_editor.configuration_panel_custom_receipt_helpText'),
          title: 'En tittel',
        }}
      />
      <div className={classes.container}>
        <Paragraph size='small'>
          {existingCustomReceiptName
            ? t('process_editor.configuration_panel_custom_receipt_name')
            : t('process_editor.configuration_panel_custom_receipt_add')}
        </Paragraph>
        <StudioToggleableTextfield
          viewProps={{
            children: existingCustomReceiptName,
            variant: existingCustomReceiptName ? 'tertiary' : 'secondary',
            fullWidth: true,
          }}
          inputProps={{
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
