import React, { createRef, useRef, useState } from 'react';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioSpinner,
  StudioErrorMessage,
  StudioAlert,
  StudioParagraph,
  StudioButton,
} from '@studio/components';
import { PencilIcon, TrashIcon } from '@studio/icons';
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
  setComponentHasOptionList: (value: boolean) => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export function OptionListEditor({
  optionsId,
  component,
  handleComponentChange,
  label,
  setComponentHasOptionList,
}: OptionListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsLists, status } = useOptionListsQuery(org, app);

  const handleDelete = () => {
    if (component.options) {
      delete component.options;
    }

    const emptyOptionsId = '';
    handleComponentChange({
      ...component,
      optionsId: emptyOptionsId,
    });

    setComponentHasOptionList(false);
  };

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
            component={component}
            handleComponentChange={handleComponentChange}
            handleDelete={handleDelete}
          />
        );
      }
      if (component.options !== undefined) {
        return (
          <EditManualOptionListEditorModal
            label={label}
            component={component}
            handleComponentChange={handleComponentChange}
            handleDelete={handleDelete}
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
  handleDelete: () => void;
};

function EditLibraryOptionListEditorModal({
  label,
  optionsId,
  optionsList,
  handleDelete,
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
      <StudioParagraph className={classes.label}>{label}</StudioParagraph>
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

type EditManualOptionListEditorModalProps = {
  label: string;
  handleDelete: () => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

function EditManualOptionListEditorModal({
  label,
  component,
  handleComponentChange,
  handleDelete,
}: EditManualOptionListEditorModalProps): React.ReactNode {
  const { t } = useTranslation();
  const modalRef = useRef<HTMLDialogElement>(null);
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

  const codeListLabels: string = component.options
    .slice(0, 3)
    .map((option: Option) => `${option.label}`)
    .join(' | ');

  return (
    <div className={classes.container}>
      <StudioParagraph className={classes.label}>{label}</StudioParagraph>
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
        heading={t('ux_editor.options.modal_header_manual_code_list')}
      >
        <StudioCodeListEditor
          codeList={component.options ?? []}
          onChange={handleOptionsChange}
          texts={editorTexts}
        />
      </StudioModal.Dialog>
    </div>
  );
}
