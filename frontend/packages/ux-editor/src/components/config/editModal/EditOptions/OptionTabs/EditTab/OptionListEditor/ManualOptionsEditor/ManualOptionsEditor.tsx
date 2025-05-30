import React, { forwardRef } from 'react';
import type { IGenericEditComponent } from '../../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import type { Option } from 'app-shared/types/Option';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal } from '@studio/components-legacy';
import { useForwardedRef } from '@studio/hooks';
import { useOptionListEditorTexts } from '../../../hooks';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptions,
} from '../../../utils/optionsUtils';
import { OptionListLabels } from '../OptionListLabels';
import { OptionListButtons } from '../OptionListButtons';
import { useHandleUpdateTextResource, useTextResourcesForLanguage } from '../hooks';
import classes from './ManualOptionsEditor.module.css';

export type ManualOptionsEditorProps = {
  handleDelete: () => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const ManualOptionsEditor = forwardRef<HTMLDialogElement, ManualOptionsEditorProps>(
  ({ component, handleComponentChange, handleDelete }, ref): React.ReactNode => {
    const { t } = useTranslation();
    const { org, app } = useStudioEnvironmentParams();
    const { data: textResources } = useTextResourcesQuery(org, app);
    const modalRef = useForwardedRef(ref);
    const editorTexts = useOptionListEditorTexts();

    const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);
    const handleUpdateTextResource = useHandleUpdateTextResource(language);

    const handleUpdateCodeList = (options: Option[]) => {
      const updatedComponent = updateComponentOptions(component, options);
      handleOptionsChange(updatedComponent, handleComponentChange);
    };

    const handleClick = () => {
      modalRef.current?.showModal();
    };

    const handleClose = () => {
      if (component.options?.length === 0) {
        const updatedComponent = resetComponentOptions(component);
        handleOptionsChange(updatedComponent, handleComponentChange);
      }
    };

    return (
      <>
        <OptionListLabels
          optionListId={component.optionsId}
          optionList={component.options}
          textResources={textResourcesForLanguage}
        />
        <OptionListButtons handleDelete={handleDelete} handleClick={handleClick} />
        <StudioModal.Dialog
          ref={modalRef}
          className={classes.editOptionTabModal}
          contentClassName={classes.content}
          closeButtonTitle={t('general.close')}
          onBeforeClose={handleClose}
          heading={t('ux_editor.options.modal_header_manual_code_list')}
        >
          <StudioCodeListEditor
            codeList={component.options}
            onCreateTextResource={handleUpdateTextResource}
            onUpdateTextResource={handleUpdateTextResource}
            onUpdateCodeList={handleUpdateCodeList}
            texts={editorTexts}
            textResources={textResourcesForLanguage}
          />
        </StudioModal.Dialog>
      </>
    );
  },
);

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572

ManualOptionsEditor.displayName = 'ManualOptionsEditor';
