import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFieldset, StudioSuggestion, type StudioSuggestionItem } from '@studio/components';

export type SubformUiFolderFieldProps = {
  subformUiFolder: string;
  subformUiFolders: string[];
  onChange: (subformUiFolder: string) => void;
};

export const SubformUiFolderField = ({
  subformUiFolder,
  subformUiFolders,
  onChange,
}: SubformUiFolderFieldProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isTouched, setIsTouched] = useState(false);

  return (
    <StudioFieldset>
      <StudioSuggestion
        clearButtonLabel={t('general.clear_selection')}
        description={t('process_editor.configuration_panel_subform_pdf_ui_folder_description')}
        emptyText={t('process_editor.configuration_panel_subform_pdf_no_ui_folder_to_select')}
        error={isTouched && !subformUiFolder && t('validation_errors.required')}
        label={t('process_editor.configuration_panel_subform_pdf_ui_folder_label')}
        multiple={false}
        onBlur={() => setIsTouched(true)}
        onSelectedChange={(item: StudioSuggestionItem | null) => onChange(item?.value ?? '')}
        required
        // Use null for an empty selection. Suggestion treats undefined as uncontrolled.
        selected={subformUiFolder ? { value: subformUiFolder, label: subformUiFolder } : null}
        tagText={t('general.required')}
      >
        {subformUiFolders.map((uiFolder) => (
          <StudioSuggestion.Option key={uiFolder} label={uiFolder} value={uiFolder}>
            {uiFolder}
          </StudioSuggestion.Option>
        ))}
      </StudioSuggestion>
    </StudioFieldset>
  );
};
