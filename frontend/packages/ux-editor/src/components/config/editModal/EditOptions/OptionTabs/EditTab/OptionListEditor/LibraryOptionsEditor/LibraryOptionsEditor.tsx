import React, { createRef, useState } from 'react';
import type { Option } from 'app-shared/types/Option';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import { useOptionListEditorTexts } from '../../../../../EditOptions/OptionTabs/hooks';
import classes from './LibraryOptionsEditor.module.css';
import { useTranslation } from 'react-i18next';
import type { CodeListEditorTexts } from '@studio/components';
import { StudioAlert, StudioCodeListEditor, StudioModal, StudioProperty } from '@studio/components';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';

type LibraryOptionsEditorProps = {
  optionsId: string;
  optionsList: Option[];
};

export function LibraryOptionsEditor({
  optionsId,
  optionsList,
}: LibraryOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { doReloadPreview } = usePreviewContext();
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const [localOptionList, setLocalOptionList] = useState<Option[]>(optionsList);
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const optionListHasChanged = (options: Option[]): boolean =>
    JSON.stringify(options) !== JSON.stringify(localOptionList);

  const handleBlurAny = (options: Option[]) => {
    if (optionListHasChanged(options)) {
      updateOptionList({ optionListId: optionsId, optionsList: options });
      setLocalOptionList(options);
      doReloadPreview();
    }
  };

  const handleClose = () => {
    modalRef.current?.close();
  };

  return (
    <>
      <StudioProperty.Button
        value={optionsId}
        title={t('ux_editor.options.option_edit_text')}
        property={t('ux_editor.modal_properties_code_list_button_title_library')}
        onClick={() => modalRef.current.showModal()}
      />
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_code_list')}
        onInteractOutside={handleClose}
        onBeforeClose={handleClose}
        footer={
          <StudioAlert severity={'warning'} size='sm'>
            {t('ux_editor.modal_properties_code_list_alert_title')}
          </StudioAlert>
        }
      >
        <StudioCodeListEditor
          codeList={localOptionList}
          onBlurAny={handleBlurAny}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </>
  );
}
