import React, { useRef } from 'react';
import { StudioCodeListEditor, StudioModal } from '@studio/components';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { useOptionListEditorTexts } from '../../hooks';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import classes from './AddManualOptionsModal.module.css';

export type EditManualOptionsWithEditorProps = {
  setComponentHasOptionList: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function AddManualOptionsModal({
  setComponentHasOptionList,
  component,
  handleComponentChange,
}: EditManualOptionsWithEditorProps) {
  const { t } = useTranslation();
  const manualOptionsModalRef = useRef<HTMLDialogElement>(null);
  const editorTexts = useOptionListEditorTexts();

  const handleOptionsChange = (options: Option[]) => {
    if (component.optionsId) {
      delete component.optionsId;
    }

    handleComponentChange({
      ...component,
      options,
    });
  };

  const handleClose = () => {
    if (component.options !== undefined) {
      setComponentHasOptionList(true);
    }

    manualOptionsModalRef.current?.close();
  };

  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={classes.modalTrigger} variant='secondary'>
        {t('general.create_new')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        ref={manualOptionsModalRef}
        className={classes.manualTabDialog}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_code_list')}
        onInteractOutside={handleClose}
        onBeforeClose={handleClose}
      >
        <StudioCodeListEditor
          codeList={component.options ?? []}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
