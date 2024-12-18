import type { IGenericEditComponent } from '../../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../../types/FormComponent';
import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioCodeListEditor,
  StudioModal,
  StudioParagraph,
  StudioButton,
} from '@studio/components';
import { PencilIcon, TrashIcon } from '@studio/icons';
import { useForwardedRef } from '@studio/hooks';
import { useOptionListEditorTexts } from '../../../hooks';
import { handleOptionsChange } from '../../utils/utils';
import type { Option } from 'app-shared/types/Option';
import classes from './ManualOptionsEditor.module.css';

type ManualOptionsEditorProps = {
  handleDelete: () => void;
} & Pick<IGenericEditComponent<SelectionComponentType>, 'component' | 'handleComponentChange'>;

export const ManualOptionsEditor = forwardRef<HTMLDialogElement, ManualOptionsEditorProps>(
  ({ component, handleComponentChange, handleDelete }, ref): React.ReactNode => {
    const { t } = useTranslation();
    const modalRef = useForwardedRef(ref);
    const editorTexts = useOptionListEditorTexts();

    const handleBlurAny = (options: Option[]) => {
      handleOptionsChange({ options, component, handleComponentChange });
    };

    const codeListLabels: string = component.options
      .map((option: Option) => `${option.label || t('general.empty_string')}`)
      .join(' | ');

    return (
      <div className={classes.container}>
        <StudioParagraph className={classes.label}>
          {t('ux_editor.modal_properties_code_list_custom_list')}
        </StudioParagraph>
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
            codeList={component.options}
            onBlurAny={handleBlurAny}
            texts={editorTexts}
          />
        </StudioModal.Dialog>
      </div>
    );
  },
);

ManualOptionsEditor.displayName = 'ManualOptionsEditor';
