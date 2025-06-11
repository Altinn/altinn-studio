import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioErrorMessage, StudioDeleteButton } from '@studio/components-legacy';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { ManualOptionsEditor } from './ManualOptionsEditor';
import { handleOptionsChange, resetComponentOptions } from '../../utils/optionsUtils';
import classes from './OptionListEditor.module.css';
import type { ITextResources } from 'app-shared/types/global';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
> & { textResources: ITextResources };

export const OptionListEditor = forwardRef<HTMLDialogElement, OptionListEditorProps>(
  (
    { component, handleComponentChange, textResources }: OptionListEditorProps,
    dialogRef,
  ): React.ReactNode => {
    const handleDeleteButtonClick = () => {
      const updatedComponent = resetComponentOptions(component);
      handleOptionsChange(updatedComponent, handleComponentChange);
    };

    if (component.options !== undefined) {
      return (
        <ManualOptionsEditor
          ref={dialogRef}
          component={component}
          handleComponentChange={handleComponentChange}
          onDeleteButtonClick={handleDeleteButtonClick}
          textResources={textResources}
        />
      );
    }

    return (
      <OptionListResolver
        optionsId={component.optionsId}
        onDeleteButtonClick={handleDeleteButtonClick}
        textResources={textResources}
      />
    );
  },
);

type OptionsListResolverProps = {
  onDeleteButtonClick: () => void;
  optionsId: string;
  textResources: ITextResources;
};

function OptionListResolver({
  onDeleteButtonClick,
  optionsId,
  textResources,
}: OptionsListResolverProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { status } = useOptionListQuery(org, app, optionsId);

  switch (status) {
    case 'pending':
      return (
        <StudioSpinner spinnerTitle={t('ux_editor.modal_properties_code_list_spinner_title')} />
      );
    case 'error':
      return (
        <>
          <StudioErrorMessage>
            {t('ux_editor.modal_properties_fetch_option_list_error_message')}
          </StudioErrorMessage>
          <StudioDeleteButton
            className={classes.deleteButton}
            onDelete={onDeleteButtonClick}
            title={t('ux_editor.options.option_remove_text')}
          >
            {t('general.delete')}
          </StudioDeleteButton>
        </>
      );
    case 'success': {
      return (
        <LibraryOptionsEditor
          onDeleteButtonClick={onDeleteButtonClick}
          optionListId={optionsId}
          textResources={textResources}
        />
      );
    }
  }
}

OptionListEditor.displayName = 'OptionListEditor';
