import React, { forwardRef, useCallback, useMemo } from 'react';
import type { IGenericEditComponent } from '../../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import type { Option } from 'app-shared/types/Option';
import type { TextResourceWithLanguage } from '@studio/content-library';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal, type TextResource } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { useOptionListEditorTexts } from '../../../hooks';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import {
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptions,
} from '../../../utils/optionsUtils';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import {
  convertTextResourceToMutationArgs,
  createTextResourceWithLanguage,
  getTextResourcesForLanguage,
} from '../utils/utils';
import { OptionListLabels } from '../OptionListLabels';
import { OptionListButtons } from '../OptionListButtons';
import classes from './ManualOptionsEditor.module.css';

export type ManualOptionsEditorProps = {
  handleDelete: () => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const ManualOptionsEditor = forwardRef<HTMLDialogElement, ManualOptionsEditorProps>(
  ({ component, handleComponentChange, handleDelete }, ref): React.ReactNode => {
    const { t } = useTranslation();
    const { org, app } = useStudioEnvironmentParams();
    const { data: textResources } = useTextResourcesQuery(org, app);
    const { mutate: updateTextResource } = useUpsertTextResourceMutation(org, app);
    const modalRef = useForwardedRef(ref);
    const editorTexts = useOptionListEditorTexts();

    const textResourcesForLanguage = useMemo(
      () => getTextResourcesForLanguage(language, textResources),
      [textResources],
    );

    const handleOptionsListChange = (options: Option[]) => {
      const updatedComponent = updateComponentOptions(component, options);
      handleOptionsChange(updatedComponent, handleComponentChange);
    };

    const handleUpdateTextResource = useCallback(
      (textResourceWithLanguage: TextResourceWithLanguage): void => {
        const mutationArgs = convertTextResourceToMutationArgs(textResourceWithLanguage);
        updateTextResource(mutationArgs);
      },
      [updateTextResource],
    );

    const handleBlurTextResource = useCallback(
      (textResource: TextResource) => {
        const updatedTextResource = createTextResourceWithLanguage(language, textResource);
        handleUpdateTextResource?.(updatedTextResource);
      },
      [handleUpdateTextResource],
    );

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
        <OptionListLabels optionListId={component.optionsId} optionList={component.options} />
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
            onAddOrDeleteItem={handleOptionsListChange}
            onBlurAny={handleOptionsListChange}
            onBlurTextResource={handleBlurTextResource}
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
