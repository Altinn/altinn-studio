import React, { createRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor } from '@studio/components-legacy';
import type { CodeListEditorTexts } from '@studio/components-legacy';
import { StudioDialog, StudioHeading, StudioAlert } from '@studio/components';
import type { OptionList } from 'app-shared/types/OptionList';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import { useOptionListEditorTexts } from '../../../hooks';
import { OptionListButtons } from '../OptionListButtons';
import { OptionListLabels } from '../OptionListLabels';
import { hasOptionListChanged } from '../../../utils/optionsUtils';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import { useHandleUpdateTextResource } from '../../hooks/useHandleUpdateTextResource';
import { useTextResourcesForLanguage } from '../../hooks/useTextResourcesForLanguage';
import classes from './LibraryOptionsEditor.module.css';
import type { ITextResources } from 'app-shared/types/global';

export type LibraryOptionsEditorProps = {
  onDeleteButtonClick: () => void;
  optionListId: string;
  textResources: ITextResources;
};

export function LibraryOptionsEditor({
  onDeleteButtonClick,
  optionListId,
  textResources,
}: LibraryOptionsEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionList } = useOptionListQuery(org, app, optionListId);
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { doReloadPreview } = usePreviewContext();
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);
  const handleUpdateTextResource = useHandleUpdateTextResource(language, doReloadPreview);

  const handleUpdateCodeList = (newOptionList: OptionList) => {
    if (hasOptionListChanged(optionList, newOptionList)) {
      updateOptionList({ optionListId, optionList: newOptionList });
      doReloadPreview();
    }
  };

  const handleEditButtonClick = () => {
    modalRef.current?.showModal();
  };

  return (
    <>
      <OptionListLabels
        optionListId={optionListId}
        optionList={optionList}
        textResources={textResourcesForLanguage}
      />
      <OptionListButtons
        onEditButtonClick={handleEditButtonClick}
        onDeleteButtonClick={onDeleteButtonClick}
      />
      <StudioDialog ref={modalRef} className={classes.editOptionTabModal}>
        <StudioDialog.Block>
          <StudioHeading level={2}>
            {t('ux_editor.options.modal_header_library_code_list')}
          </StudioHeading>
        </StudioDialog.Block>
        <StudioDialog.Block className={classes.content}>
          <StudioCodeListEditor
            codeList={optionList}
            onCreateTextResource={handleUpdateTextResource}
            onUpdateTextResource={handleUpdateTextResource}
            onUpdateCodeList={handleUpdateCodeList}
            texts={editorTexts}
            textResources={textResourcesForLanguage}
          />
        </StudioDialog.Block>
        <StudioDialog.Block>
          <StudioAlert data-color='warning'>
            {t('ux_editor.modal_properties_code_list_alert_title')}
          </StudioAlert>
        </StudioDialog.Block>
      </StudioDialog>
    </>
  );
}

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572
