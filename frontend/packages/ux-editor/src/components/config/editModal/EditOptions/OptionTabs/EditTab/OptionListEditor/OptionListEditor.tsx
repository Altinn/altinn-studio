import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner, StudioErrorMessage } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../../componentConfig';
import type { SelectionComponentType } from '../../../../../../../types/FormComponent';
import { useOptionListQuery } from 'app-shared/hooks/queries';
import { EditManualOptionListEditorModal } from './ManualOptionsEditor/ManualOptionsEditor';
import { EditLibraryOptionListEditorModal } from './LibraryOptionsEditor/LibraryOptionsEditor';

export type OptionListEditorProps = Pick<
  IGenericEditComponent<SelectionComponentType>,
  'component' | 'handleComponentChange'
>;

export function OptionListEditor({
  component,
  handleComponentChange,
}: OptionListEditorProps): React.ReactNode {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: optionsList, status } = useOptionListQuery(org, app, component.optionsId);

  if (component.options !== undefined) {
    return (
      <EditManualOptionListEditorModal
        component={component}
        handleComponentChange={handleComponentChange}
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
      return (
        <EditLibraryOptionListEditorModal
          label={component.label}
          optionsId={component.optionsId}
          optionsList={optionsList}
        />
      );
    }
  }
}
