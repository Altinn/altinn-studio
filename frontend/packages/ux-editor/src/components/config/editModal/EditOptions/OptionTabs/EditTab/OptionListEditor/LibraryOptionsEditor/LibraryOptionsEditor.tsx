import React, { createRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal, StudioAlert } from '@studio/components-legacy';
import type { CodeListEditorTexts } from '@studio/components-legacy';
import type { OptionList } from 'app-shared/types/OptionList';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  useUpdateOptionListMutation,
  useUpsertTextResourceMutation,
} from 'app-shared/hooks/mutations';
import { useOptionListEditorTexts } from '../../../hooks';
import { OptionListButtons } from '../OptionListButtons';
import { OptionListLabels } from '../OptionListLabels';
import { hasOptionListChanged } from '../../../utils/optionsUtils';
import { useOptionListQuery, useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useHandleBlurTextResource, useTextResourcesForLanguage } from '../hooks';
import classes from './LibraryOptionsEditor.module.css';

export type LibraryOptionsEditorProps = {
  handleDelete: () => void;
  optionListId: string;
};

export function LibraryOptionsEditor({
  handleDelete,
  optionListId,
}: LibraryOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionList } = useOptionListQuery(org, app, optionListId);
  const { data: textResources } = useTextResourcesQuery(org, app);
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { mutate: updateTextResource } = useUpsertTextResourceMutation(org, app);
  const { doReloadPreview } = usePreviewContext();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);
  const handleBlurTextResource = useHandleBlurTextResource(
    language,
    updateTextResource,
    doReloadPreview,
  );

  const handleUpdateCodeList = (newOptionList: OptionList) => {
    if (hasOptionListChanged(optionList, newOptionList)) {
      updateOptionList({ optionListId, optionList: newOptionList });
      doReloadPreview();
    }
  };

  const handleClick = () => {
    modalRef.current?.showModal();
  };

  return (
    <>
      <OptionListLabels optionListId={optionListId} optionList={optionList} />
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
          codeList={optionList}
          onCreateTextResource={handleBlurTextResource}
          onUpdateCodeList={handleUpdateCodeList}
          onUpdateTextResource={handleBlurTextResource}
          texts={editorTexts}
          textResources={textResourcesForLanguage}
        />
      </StudioModal.Dialog>
    </>
  );
}

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572
