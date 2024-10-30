import React, { useRef } from 'react';
import { Alert } from '@digdir/designsystemet-react';
import classes from './EditManualOptionsWithEditor.module.css';
import { StudioCodeListEditor, StudioModal, StudioProperty } from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { useCodeListButtonValue, useCodeListEditorTexts } from '../hooks';
import { useDebounce } from '@studio/hooks';
import type { EditManualOptionsProps } from '../EditManualOptions';

export function EditManualOptionsWithEditor({
  component,
  handleComponentChange,
  isLayoutOptionsUnsupported,
}: EditManualOptionsProps) {
  const { t } = useTranslation();
  const manualOptionsModalRef = useRef<HTMLDialogElement>(null);
  const buttonValue = useCodeListButtonValue(component.options);
  const editorTexts = useCodeListEditorTexts();
  const { debounce } = useDebounce({ debounceTimeInMs: 500 });

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    debounce(() => {
      handleComponentChange({
        ...component,
        options,
      });
    });
  };

  if (isLayoutOptionsUnsupported) {
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
          className={classes.codeListDialog}
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
