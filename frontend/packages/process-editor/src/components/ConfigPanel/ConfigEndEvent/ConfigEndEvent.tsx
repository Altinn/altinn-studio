import React from 'react';
import type { LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import {
  StudioButton,
  StudioLabelAsParagraph,
  StudioSectionHeader,
  StudioToggleableTextfield,
} from '@studio/components';
import { Link, Paragraph } from '@digdir/design-system-react';
import { PencilWritingIcon, PlusCircleIcon } from '@studio/icons';
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
        icon={<ConfigIcon taskType={'endEvent'} />} // TODO - BYTTE ICON
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

          {!existingCustomReceiptLayoutSetName ? (
            <StudioButton
              size='small'
              onClick={() => {}}
              icon={<PlusCircleIcon />}
              variant='tertiary'
            >
              Opprett din egen kvittering
            </StudioButton>
          ) : (
            <p>TODO</p>
          )}
        </div>

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
            label: t('process_editor.configuration_panel_custom_receipt_add_button_title'),
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

const StandardReceipt = (): React.JSX.Element => {
  return (
    <StudioButton onClick={() => {}} icon={<PlusCircleIcon />} variant='tertiary'>
      Opprett din egen kvittering
    </StudioButton>
  );
};
