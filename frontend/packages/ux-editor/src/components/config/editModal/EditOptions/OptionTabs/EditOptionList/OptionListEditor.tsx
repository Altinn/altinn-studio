import React, { createRef } from 'react';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioSpinner,
  StudioErrorMessage,
  type CodeListEditorTexts,
} from '@studio/components';
import { TableIcon } from '@studio/icons';
import { useDebounce } from '@studio/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations/useUpdateOptionListMutation';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import { useOptionListEditorTexts } from '../hooks/useOptionListEditorTexts';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import classes from './OptionListEditor.module.css';
import { AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS } from 'app-shared/constants';

type OptionListEditorProps = {
  optionsId: string;
};

export function OptionListEditor({ optionsId }: OptionListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsListMap, status } = useOptionListsQuery(org, app);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')} />
      );
    case 'error':
      return (
        <StudioErrorMessage>{t('ux_editor.modal_properties_error_message')}</StudioErrorMessage>
      );
    case 'success': {
      return (
        <OptionListEditorModal optionsList={optionsListMap[optionsId]} optionsId={optionsId} />
      );
    }
  }
}

type OptionListEditorModalProps = {
  optionsList: Option[];
  optionsId: string;
};

function OptionListEditorModal({
  optionsList,
  optionsId,
}: OptionListEditorModalProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { doReloadPreview } = usePreviewContext();
  const { mutate: updateOptionList } = useUpdateOptionListMutation(org, app);
  const { debounce } = useDebounce({ debounceTimeInMs: AUTOSAVE_DEBOUNCE_INTERVAL_MILLISECONDS });
  const editorTexts: CodeListEditorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const handleOptionsChange = (options: Option[]) => {
    debounce(() => {
      updateOptionList({ optionListId: optionsId, optionsList: options });
      doReloadPreview();
    });
  };

  const handleClose = () => {
    modalRef.current?.close();
  };

  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={classes.modalTrigger} variant='tertiary' icon={<TableIcon />}>
        {t('ux_editor.modal_properties_code_list_open_editor')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_codelist')}
        onBeforeClose={handleClose}
        onInteractOutside={handleClose}
      >
        <StudioCodeListEditor
          codeList={optionsList}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
