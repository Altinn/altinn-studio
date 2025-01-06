import type { Option } from 'app-shared/types/Option';
import React, { createRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal, StudioAlert } from '@studio/components';
import type { CodeListEditorTexts } from '@studio/components';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import { useOptionListEditorTexts } from '../../../hooks';
import { OptionListButtons } from '../OptionListButtons';
import { OptionListLabels } from '../OptionListLabels';
import { hasOptionListChanged } from '../../../utils/optionsUtils';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import classes from './LibraryOptionsEditor.module.css';

type LibraryOptionsEditorProps = {
  handleDelete: () => void;
  optionsId: string;
};

export function LibraryOptionsEditor({
  handleDelete,
  optionsId,
}: LibraryOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsList } = useOptionListQuery(org, app, optionsId);
  const { doReloadPreview } = usePreviewContext();
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const handleBlurAny = (options: Option[]) => {
    if (hasOptionListChanged(optionsList, options)) {
      updateOptionList({ optionListId: optionsId, optionsList: options });
      doReloadPreview();
    }
  };

  const handleClick = () => {
    modalRef.current?.showModal();
  };

  return (
    <>
      <OptionListLabels optionsId={optionsId} optionsList={optionsList} />
      <OptionListButtons handleClick={handleClick} handleDelete={handleDelete} />
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.options.modal_header_library_code_list')}
        footer={
          <StudioAlert severity={'warning'} size='sm'>
            {t('ux_editor.modal_properties_code_list_alert_title')}
          </StudioAlert>
        }
      >
        <StudioCodeListEditor
          codeList={optionsList}
          onBlurAny={handleBlurAny}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </>
  );
}
