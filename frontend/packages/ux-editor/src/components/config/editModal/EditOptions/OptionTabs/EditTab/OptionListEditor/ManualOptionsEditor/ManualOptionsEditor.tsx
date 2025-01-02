import { useOptionListEditorTexts } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/hooks';
import type { Option } from 'app-shared/types/Option';
import classes from './ManualOptionsEditor.module.css';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import { useTranslation } from 'react-i18next';
import React, { useRef } from 'react';
import { StudioCodeListEditor, StudioModal, StudioProperty } from '@studio/components';

type ManualOptionsEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function ManualOptionsEditor({
  component,
  handleComponentChange,
}: ManualOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDialogElement>(null);
  const editorTexts = useOptionListEditorTexts();

  const handleBlurAny = (options: Option[]) => {
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
        value={t('ux_editor.modal_properties_code_list_custom_list')}
        title={t('ux_editor.options.option_edit_text')}
        property={t('ux_editor.modal_properties_code_list_button_title_manual')}
        onClick={() => modalRef.current.showModal()}
      />
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_code_list')}
      >
        <StudioCodeListEditor
          codeList={component.options ?? []}
          onBlurAny={handleBlurAny}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </>
  );
}
