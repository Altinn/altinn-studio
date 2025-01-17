import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioErrorMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { ManualOptionsEditor } from './ManualOptionsEditor';
import { handleOptionsChange, resetComponentOptions } from '../../utils/optionsUtils';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export const OptionListEditor = forwardRef<HTMLDialogElement, OptionListEditorProps>(
  ({ component, handleComponentChange }: OptionListEditorProps, dialogRef): React.ReactNode => {
    const handleDelete = () => {
      const updatedComponent = resetComponentOptions(component);
      handleOptionsChange(updatedComponent, handleComponentChange);
    };

    if (component.options !== undefined) {
      return (
        <ManualOptionsEditor
          ref={dialogRef}
          component={component}
          handleComponentChange={handleComponentChange}
          handleDelete={handleDelete}
        />
      );
    }

    return <OptionListResolver optionsId={component.optionsId} handleDelete={handleDelete} />;
  },
);

type OptionsListResolverProps = {
  handleDelete: () => void;
  optionsId: string;
};

function OptionListResolver({
  handleDelete,
  optionsId,
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
        <StudioErrorMessage>
          {t('ux_editor.modal_properties_fetch_option_list_error_message')}
        </StudioErrorMessage>
      );
    case 'success': {
      return <LibraryOptionsEditor handleDelete={handleDelete} optionListId={optionsId} />;
    }
  }
}

OptionListEditor.displayName = 'OptionListEditor';
