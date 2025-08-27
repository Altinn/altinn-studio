import React, { forwardRef, useCallback } from 'react';
import classes from './ManualOptionsDialog.module.css';
import {
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptions,
} from '../../utils/optionsUtils';
import { useTranslation } from 'react-i18next';
import type { ITextResources } from 'app-shared/types/global';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import type { Option } from 'app-shared/types/Option';
import { useOptionListEditorTexts } from '../../hooks';
import { useTextResourcesForLanguage } from '../hooks/useTextResourcesForLanguage';
import { useHandleUpdateTextResource } from '../hooks/useHandleUpdateTextResource';
import { StudioCodeListEditor, StudioModal } from '@studio/components-legacy';

export type ManualOptionsDialogProps = {
  textResources: ITextResources;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const ManualOptionsDialog = forwardRef<HTMLDialogElement, ManualOptionsDialogProps>(
  ({ component, handleComponentChange, textResources }, ref) => {
    const { t } = useTranslation();
    const editorTexts = useOptionListEditorTexts();
    const textResourcesForLanguage = useTextResourcesForLanguage(language, textResources);
    const handleUpdateTextResource = useHandleUpdateTextResource(language);

    const handleUpdateCodeList = useCallback(
      (options: Option[]) => {
        const updatedComponent = updateComponentOptions(component, options);
        handleOptionsChange(updatedComponent, handleComponentChange);
      },
      [component, handleComponentChange],
    );

    const handleBeforeClose = useCallback((): void => {
      if (component.options?.length === 0) {
        const updatedComponent = resetComponentOptions(component);
        handleOptionsChange(updatedComponent, handleComponentChange);
      }
    }, [component, handleComponentChange]);

    return (
      <StudioModal.Dialog
        ref={ref}
        className={classes.editOptionTabModal}
        contentClassName={classes.content}
        closeButtonTitle={t('general.close')}
        onBeforeClose={handleBeforeClose}
        heading={t('ux_editor.options.modal_header_manual_code_list')}
      >
        {component.options && (
          <StudioCodeListEditor
            codeList={component.options}
            onCreateTextResource={handleUpdateTextResource}
            onUpdateTextResource={handleUpdateTextResource}
            onUpdateCodeList={handleUpdateCodeList}
            texts={editorTexts}
            textResources={textResourcesForLanguage}
          />
        )}
      </StudioModal.Dialog>
    );
  },
);

ManualOptionsDialog.displayName = 'CodeListDialog';

const language: string = 'nb'; // Todo: Let the user choose the language: https://github.com/Altinn/altinn-studio/issues/14572
