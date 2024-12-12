import type { Option } from 'app-shared/types/Option';
import React, { createRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioAlert,
  StudioParagraph,
  StudioButton,
} from '@studio/components';
import type { CodeListEditorTexts } from '@studio/components';
import { PencilIcon, TrashIcon } from '@studio/icons';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations';
import { useOptionListEditorTexts } from '@altinn/ux-editor/components/config/editModal/EditOptions/OptionTabs/hooks';
import type { OptionListEditorProps } from '../OptionListEditor';
import classes from './LibraryOptionsEditor.module.css';

type LibraryOptionsEditorProps = {
  optionsList: Option[];
  handleDelete: () => void;
} & Pick<OptionListEditorProps, 'optionsId' | 'component'>;

export function LibraryOptionsEditor({
  component,
  optionsId,
  optionsList,
  handleDelete,
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

  const handleOptionsChange = (options: Option[]) => {
    if (optionListHasChanged(options)) {
      updateOptionList({ optionListId: optionsId, optionsList: options });
      setLocalOptionList(options);
      doReloadPreview();
    }
  };

  const handleClose = () => {
    modalRef.current?.close();
  };

  const codeListLabels: string = localOptionList
    .slice(0, 3)
    .map((option: Option) => `${option.label}`)
    .join(' | ');

  return (
    <div className={classes.container}>
      <StudioParagraph className={classes.label}>{component.optionsId}</StudioParagraph>
      <StudioParagraph size='sm' className={classes.codeListLabels}>
        {codeListLabels}
      </StudioParagraph>
      <div className={classes.buttonContainer}>
        <StudioButton
          icon={<PencilIcon />}
          variant='secondary'
          onClick={() => modalRef.current.showModal()}
        >
          {t('general.edit')}
        </StudioButton>
        <StudioButton
          color='danger'
          icon={<TrashIcon />}
          variant='secondary'
          onClick={handleDelete}
        >
          {t('general.delete')}
        </StudioButton>
      </div>
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.options.modal_header_library_code_list')}
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
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </div>
  );
}
