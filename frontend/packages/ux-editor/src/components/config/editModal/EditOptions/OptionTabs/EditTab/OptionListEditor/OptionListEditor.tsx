import React, { createRef, useRef, useState } from 'react';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioSpinner,
  StudioErrorMessage,
  StudioAlert,
  StudioProperty,
} from '@studio/components';
import type { CodeListEditorTexts } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useUpdateOptionListMutation } from 'app-shared/hooks/mutations/useUpdateOptionListMutation';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import { useOptionListEditorTexts } from '../../hooks/useOptionListEditorTexts';
import { usePreviewContext } from 'app-development/contexts/PreviewContext';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import classes from './OptionListEditor.module.css';

type OptionListEditorProps = {
  optionsId: string;
  label: string;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function OptionListEditor({
  optionsId,
  component,
  handleComponentChange,
  label,
}: OptionListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsLists, status } = useOptionListsQuery(org, app);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')} />
      );
    case 'error':
      return (
        <StudioErrorMessage>
          {t('ux_editor.modal_properties_fetch_option_list_error_message')}
        </StudioErrorMessage>
      );
    case 'success': {
      if (optionsLists[optionsId] !== undefined) {
        return (
          <EditLibraryOptionListEditorModal
            label={label}
            optionsId={optionsId}
            optionsList={optionsLists[optionsId]}
          />
        );
      }
      if (component.options !== undefined) {
        return (
          <EditManualOptionListEditorModal
            label={label}
            component={component}
            handleComponentChange={handleComponentChange}
          />
        );
      }
    }
  }
}

type EditLibraryOptionListEditorModalProps = {
  label: string;
  optionsId: string;
  optionsList: Option[];
};

function EditLibraryOptionListEditorModal({
  label,
  optionsId,
  optionsList,
}: EditLibraryOptionListEditorModalProps): React.ReactNode {
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
        value={label}
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

type EditManualOptionListEditorModalProps = {
  label: string;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function EditManualOptionListEditorModal({
  label,
  component,
  handleComponentChange,
}: EditManualOptionListEditorModalProps): React.ReactNode {
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
        value={label}
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
