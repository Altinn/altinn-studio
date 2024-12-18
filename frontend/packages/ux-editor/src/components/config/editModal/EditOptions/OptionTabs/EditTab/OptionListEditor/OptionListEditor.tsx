import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioErrorMessage, StudioAlert } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { LibraryOptionsEditor } from './LibraryOptionsEditor';
import { ManualOptionsEditor } from './ManualOptionsEditor';
import { handleOptionsIdChange } from '../utils/utils';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export const OptionListEditor = forwardRef<HTMLDialogElement, OptionListEditorProps>(
  ({ component, handleComponentChange }: OptionListEditorProps, dialogRef): React.ReactNode => {
    const { t } = useTranslation();
    const { org, app } = useStudioEnvironmentParams();
    const { data: optionsLists, status } = useOptionListsQuery(org, app);

    const handleDelete = () => {
      handleOptionsIdChange({ component, handleComponentChange, optionsId: undefined });
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
        if (optionsLists[component.optionsId] !== undefined) {
          return (
            <LibraryOptionsEditor
              component={component}
              optionsList={optionsLists[component.optionsId]}
              handleDelete={handleDelete}
            />
          );
        }
        return (
          <StudioAlert severity={'info'} size='sm'>
            {t('ux_editor.options.tab_option_list_alert_title')}
          </StudioAlert>
        );
      }
    }
  },
);

OptionListEditor.displayName = 'OptionListEditor';
