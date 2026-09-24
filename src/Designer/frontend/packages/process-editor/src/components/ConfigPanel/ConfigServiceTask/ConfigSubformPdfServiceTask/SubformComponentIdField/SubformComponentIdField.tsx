import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';

export type SubformComponentIdFieldProps = {
  subformComponentId: string;
  componentIds: string[];
  onChange: (subformComponentId: string) => void;
};

/** The Subform component the task generates a pdf from, picked among the given component ids. */
export const SubformComponentIdField = ({
  subformComponentId,
  componentIds,
  onChange,
}: SubformComponentIdFieldProps): React.ReactElement => {
  const { t } = useTranslation();
  const [isTouched, setIsTouched] = useState(false);

  return (
    <StudioSuggestion
      commitPendingClearOnBlur
      description={t('process_editor.configuration_panel_subform_pdf_component_id_description')}
      emptyText={t('process_editor.configuration_panel_subform_pdf_no_component_to_select')}
      error={isTouched && !subformComponentId && t('validation_errors.required')}
      label={t('process_editor.configuration_panel_subform_pdf_component_id_label')}
      multiple={false}
      onBlur={() => setIsTouched(true)}
      onSelectedChange={(item: StudioSuggestionItem | null) => onChange(item?.value ?? '')}
      required
      // `null` rather than `undefined`, which Suggestion treats as uncontrolled.
      selected={
        subformComponentId ? { value: subformComponentId, label: subformComponentId } : null
      }
      tagText={t('general.required')}
    >
      {componentIds.map((componentId) => (
        <StudioSuggestion.Option key={componentId} label={componentId} value={componentId}>
          {componentId}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
