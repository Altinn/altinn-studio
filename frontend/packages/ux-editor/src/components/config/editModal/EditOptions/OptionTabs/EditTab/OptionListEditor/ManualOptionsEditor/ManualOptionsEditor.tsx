import type { IGenericEditComponent } from '../../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioCodeListEditor, StudioModal } from '@studio/components';
import { useForwardedRef } from '@studio/hooks';
import { useOptionListEditorTexts } from '../../../hooks';
import {
  handleOptionsChange,
  resetComponentOptions,
  updateComponentOptions,
} from '../../../utils/optionsUtils';
import { OptionListLabels } from '../OptionListLabels';
import { OptionListButtons } from '../OptionListButtons';
import type { Option } from 'app-shared/types/Option';
import classes from './ManualOptionsEditor.module.css';

export type ManualOptionsEditorProps = {
  handleDelete: () => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const ManualOptionsEditor = forwardRef<HTMLDialogElement, ManualOptionsEditorProps>(
  ({ component, handleComponentChange, handleDelete }, ref): React.ReactNode => {
    const { t } = useTranslation();
    const modalRef = useForwardedRef(ref);
    const editorTexts = useOptionListEditorTexts();

    const handleOptionsListChange = (options: Option[]) => {
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
            texts={editorTexts}
          />
        </StudioModal.Dialog>
      </>
    );
  },
);

ManualOptionsEditor.displayName = 'ManualOptionsEditor';
