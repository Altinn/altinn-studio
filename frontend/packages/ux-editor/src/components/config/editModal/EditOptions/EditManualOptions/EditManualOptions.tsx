import React, { useRef } from 'react';
import { Alert } from '@digdir/designsystemet-react';
import classes from './EditManualOptions.module.css';
import { StudioCodeListEditor, StudioModal, StudioProperty } from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import type { IGenericEditComponent } from '../../../componentConfig';
import type { SelectionComponentType } from '../../../../../types/FormComponent';
import { useCodeListButtonValue, useCodeListEditorTexts } from '../hooks';

export type EditManualOptionsProps = {
  onlyCodeListOptions?: boolean;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function EditManualOptions({
  component,
  handleComponentChange,
  onlyCodeListOptions,
}: EditManualOptionsProps) {
  const { t } = useTranslation();
  const manualOptionsModalRef = useRef<HTMLDialogElement>(null);
  const buttonValue = useCodeListButtonValue(component.options);
  const editorTexts = useCodeListEditorTexts();

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange({
      ...component,
      options,
    });
  };

  if (onlyCodeListOptions) {
    return <Alert severity='info'>{t('ux_editor.options.codelist_only')}</Alert>;
  }

  return (
    <>
      <StudioProperty.Button
        onClick={() => manualOptionsModalRef.current.showModal()}
        property={t('ux_editor.modal_properties_code_list_custom_list')}
        value={buttonValue}
      />
      <StudioModal.Root>
        <StudioModal.Dialog
          ref={manualOptionsModalRef}
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
    </>
  );
}
