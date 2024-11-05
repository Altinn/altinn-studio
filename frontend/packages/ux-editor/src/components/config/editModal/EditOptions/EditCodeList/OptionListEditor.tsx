import React, { createRef, useState } from 'react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import type { ApiError } from 'app-shared/types/api/ApiError';
import type { AxiosError } from 'axios';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioSpinner,
  StudioErrorMessage,
} from '@studio/components';
import { TableIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from '../../../../../hooks/mutations/useUpdateOptionListMutation';
import { useOptionListsQuery } from '../../../../../hooks/queries/useOptionListsQuery';
import { useOptionListEditorTexts } from './hooks/useOptionListEditorTexts';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import classes from './OptionListEditor.module.css';

type OptionListEditorProps = Pick<IGenericEditComponent<SelectionComponentType>, 'component'>;

export function OptionListEditor({ component }: OptionListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsListMap, status } = useOptionListsQuery(org, app);

  // console.log(status);
  // console.log(component.optionsId);
  // console.log(optionsListMap);
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
      console.log(optionsListMap[component.optionsId]);
      return (
        <OptionListEditorModal
          optionList={optionsListMap[component.optionsId]}
          component={component}
        />
      );
    }
  }
}

type OptionListEditorModalProps = {
  optionList: Option[];
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component'>;

function OptionListEditorModal({
  optionList,
  component,
}: OptionListEditorModalProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { doReloadPreview } = usePreviewContext();
  const { mutate: uploadOptionList } = useUpdateOptionListMutation(org, app, {
    hideDefaultError: (apiError: AxiosError<ApiError>) => !apiError.response.data.errorCode,
  });
  const [currentOptionList, setCurrentOptionList] = useState<Option[]>(optionList);
  const editorTexts = useOptionListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const handleOptionsChange = (options: Option[]) => {
    setCurrentOptionList(options);
  };

  const handleClose = () => {
    uploadOptionList({ optionListId: component.optionsId, optionsList: currentOptionList });
    doReloadPreview();
    modalRef.current?.close();
  };

  return (
    <StudioModal.Root>
      <StudioModal.Trigger className={classes.modalTrigger} variant='tertiary' icon={<TableIcon />}>
        {t('ux_editor.modal_properties_code_list_open_editor')}
      </StudioModal.Trigger>
      <StudioModal.Dialog
        ref={modalRef}
        className={classes.manualTabModal}
        closeButtonTitle={t('general.close')}
        heading={t('ux_editor.modal_add_options_codelist')}
        onBeforeClose={handleClose}
        onInteractOutside={handleClose}
      >
        <StudioCodeListEditor
          codeList={currentOptionList}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
