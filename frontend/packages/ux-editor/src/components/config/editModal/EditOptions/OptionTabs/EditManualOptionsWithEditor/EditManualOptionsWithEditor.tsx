import React, { useRef } from 'react';
import classes from './EditManualOptionsWithEditor.module.css';
import { StudioCodeListEditor, StudioModal, StudioProperty } from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { useOptionListButtonValue, useOptionListEditorTexts } from '../hooks';
import type { EditManualOptionsProps } from '../EditManualOptions';
import { CodeListValueType } from '@studio/components/src/components/StudioCodelistEditor/types/CodeListValueType';

export function EditManualOptionsWithEditor({
  component,
  handleComponentChange,
}: EditManualOptionsProps) {
  const { t } = useTranslation();
  const manualOptionsModalRef = useRef<HTMLDialogElement>(null);
  const buttonValue = useOptionListButtonValue(component.options);
  const editorTexts = useOptionListEditorTexts();

  const valueType = getValueType(component.options);

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange({
      ...component,
      options,
    });
  };

  return (
    <>
      <StudioProperty.Button
        onClick={() => manualOptionsModalRef.current.showModal()}
        property={t('ux_editor.modal_properties_code_list_custom_list')}
        value={buttonValue}
      />
      <StudioModal.Dialog
        ref={manualOptionsModalRef}
        className={classes.manualTabDialog}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_code_list')}
      >
        <StudioCodeListEditor
          codeList={component.options ?? []}
          onChange={(optionList) => handleOptionsChange(optionList)}
          texts={editorTexts}
          valueType={valueType}
        />
      </StudioModal.Dialog>
    </>
  );
}

const getValueType = (optionList?: Option[]): CodeListValueType => {
  if (optionList) {
    const firstCodeListValue = optionList[0].value;
    if (typeof firstCodeListValue === CodeListValueType.String) return CodeListValueType.String;
    if (typeof firstCodeListValue === CodeListValueType.Number) return CodeListValueType.Number;
    if (typeof firstCodeListValue === CodeListValueType.Boolean) return CodeListValueType.Boolean;
  } else {
    return CodeListValueType.String;
  }
};
