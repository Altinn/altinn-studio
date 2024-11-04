import React, { createRef, useEffect, useState } from 'react';
import type { IGenericEditComponent } from '@altinn/ux-editor/components/config/componentConfig';
import type { SelectionComponentType } from '@altinn/ux-editor/types/FormComponent';
import type { Option } from 'app-shared/types/Option';
import type { ApiError } from 'app-shared/types/api/ApiError';
import type { AxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioSpinner,
  type CodeList,
} from '@studio/components';
import { TableIcon } from '@studio/icons';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from '../../../../../hooks/mutations/useUpdateOptionListMutation';
import { useOptionListsQuery } from '../../../../../hooks/queries/useOptionListsQuery';
import { useCodeListEditorTexts } from './hooks/useCodeListEditorTexts';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import { ErrorMessage } from '@digdir/designsystemet-react';
import classes from './CodeListEditor.module.css';

type CodeListEditorProps = Pick<IGenericEditComponent<SelectionComponentType>, 'component'>;

export function CodeListEditor({ component }: CodeListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsListMap, status, error } = useOptionListsQuery(org, app);
  const [codeList, setCodeList] = useState<CodeList>([]);

  useEffect(() => {
    if (status === 'pending') return;
    handleOptionsChange(optionsListMap[component.optionsId]);
  }, [optionsListMap, component.optionsId, status]);

  const handleOptionsChange = (options?: Option[]) => {
    if (options === undefined) return;
    setCodeList(options);
  };

  if (component.optionsId === undefined) return <StudioSpinner spinnerTitle={'test'} />;
  switch (status) {
    case 'pending':
      return <StudioSpinner spinnerTitle={'test'} />; // Extract title to nb.json
    case 'error':
      return (
        <ErrorMessage>
          {error instanceof Error ? error.message : t('ux_editor.modal_properties_error_message')}
        </ErrorMessage>
      );
    case 'success': {
      return (
        <CodeListEditorModal
          codeList={codeList}
          component={component}
          handleOptionsChange={handleOptionsChange}
        />
      );
    }
  }
}

type CodeListEditorModalProps = {
  codeList: CodeList;
  handleOptionsChange: (options?: Option[]) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component'>;

function CodeListEditorModal({
  codeList,
  component,
  handleOptionsChange,
}: CodeListEditorModalProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { doReloadPreview } = usePreviewContext();
  const { mutate: uploadOptionList } = useUpdateOptionListMutation(org, app, {
    hideDefaultError: (apiError: AxiosError<ApiError>) => !apiError.response.data.errorCode,
  });
  const editorTexts = useCodeListEditorTexts();
  const modalRef = createRef<HTMLDialogElement>();

  const handleClose = () => {
    uploadOptionList({ optionListId: component.optionsId, optionsList: codeList });
    doReloadPreview();
    modalRef.current?.close();
  };

  return (
    <StudioModal.Root>
      <StudioModal.Trigger
        className={classes.modalTrigger}
        variant='secondary'
        icon={<TableIcon />}
      >
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
          codeList={codeList}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </StudioModal.Root>
  );
}
