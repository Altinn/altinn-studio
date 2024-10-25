import React, { useRef } from 'react';
import { Alert } from '@digdir/designsystemet-react';
import classes from './EditManualOptions.module.css';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioParagraph,
  StudioTable,
  StudioProperty,
} from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { TableIcon } from '@studio/icons';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';

export type EditManualOptionsProps = {
  onlyCodeListOptions?: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component', 'handleComponentChange'>;

export function EditManualOptions({
  component,
  handleComponentChange,
  onlyCodeListOptions,
}: EditManualOptionsProps) {
  const { t } = useTranslation();
  const manualCodeListModalRef = useRef<HTMLDialogElement>(null);

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange({
      ...component,
      options,
    });
  };

  const editorTexts = {
    add: t('ux_editor.modal_new_option'),
    codeList: t('ux_editor.modal_add_options_codelist'),
    delete: t('general.delete'),
    deleteItem: (number) => t('ux_editor.modal_properties_code_list_delete_item', { number }),
    description: t('general.description'),
    emptyCodeList: t('ux_editor.modal_properties_code_list_empty'),
    helpText: t('ux_editor.options_text_help_text'),
    itemDescription: (number) =>
      t('ux_editor.modal_properties_code_list_item_description', { number }),
    itemHelpText: (number) => t('ux_editor.modal_properties_code_list_item_helpText', { number }),
    itemLabel: (number) => t('ux_editor.modal_properties_code_list_item_label', { number }),
    itemValue: (number) => t('ux_editor.modal_properties_code_list_item_value', { number }),
    label: t('ux_editor.options_text_label'),
    value: t('general.value'),
  };

  if (onlyCodeListOptions) {
    return <Alert severity='info'>{t('ux_editor.options.codelist_only')}</Alert>;
  }

  return (
    <div className={classes.root}>
      {component.options?.length > 0 && <OptionsSummary options={component.options} />}
      <StudioProperty.Button
        onClick={() => manualCodeListModalRef.current.showModal()}
        property='Åpne redigeringsverktøy'
        icon={<TableIcon />}
      />
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={manualCodeListModalRef}
          className={classes.manualTabModal}
          closeButtonTitle={t('general.close')}
          heading={t('ux_editor.modal_add_options_codelist')}
        >
          <StudioCodeListEditor
            codeList={component.options ?? []}
            onChange={(codeList) => handleOptionsChange(codeList)}
            texts={editorTexts}
          />
        </StudioModal.Dialog>
      </StudioModal.Root>
    </div>
  );
}

type OptionsSummaryProps = {
  options: Option[];
};

const OptionsSummary = ({ options }: OptionsSummaryProps) => {
  return (
    <StudioParagraph className={classes.paddingInline} size='sm'>
      {options.length} alternativ er definert.
    </StudioParagraph>
  );

  return (
    <div className={classes.paddingInline}>
      <StudioTable size='sm' className={classes.optionsSummary}>
        <StudioTable.Head>
          <StudioTable.Row>
            <StudioTable.HeaderCell className={classes.summaryHeaderCell}>
              Verdi
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell className={classes.summaryHeaderCell}>
              Ledetekst
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell className={classes.summaryHeaderCell}>
              Beskrivelse
            </StudioTable.HeaderCell>
            <StudioTable.HeaderCell className={classes.summaryHeaderCell}>
              Hjelpetekst
            </StudioTable.HeaderCell>
          </StudioTable.Row>
        </StudioTable.Head>
        <StudioTable.Body>
          {options.map((option, index) => (
            <StudioTable.Row key={`${index}-${option.value}`}>
              <StudioTable.Cell className={classes.summaryBodyCell}>
                {option.value}
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.summaryBodyCell}>
                {option.label}
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.summaryBodyCell}>
                {option.description}
              </StudioTable.Cell>
              <StudioTable.Cell className={classes.summaryBodyCell}>
                {option.helpText}
              </StudioTable.Cell>
            </StudioTable.Row>
          ))}
        </StudioTable.Body>
      </StudioTable>
    </div>
  );
};
