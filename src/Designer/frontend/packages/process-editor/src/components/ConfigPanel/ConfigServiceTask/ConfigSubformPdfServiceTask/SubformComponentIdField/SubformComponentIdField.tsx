import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useSubformComponentIds } from './useSubformComponentIds';

export type SubformComponentIdFieldProps = {
  subformComponentId: string;
  subformDataTypeId: string;
  onChange: (subformComponentId: string) => void;
};

/**
 * The Subform component the task generates a pdf from. Candidates can only be derived once the
 * task has pages of its own, so the id can always be typed as well.
 */
export const SubformComponentIdField = ({
  subformComponentId,
  subformDataTypeId,
  onChange,
}: SubformComponentIdFieldProps): React.ReactElement => {
  const { t } = useTranslation();
  const { subformComponentIds } = useSubformComponentIds(subformDataTypeId);
  const [isTouched, setIsTouched] = useState(false);

  // A component the task already points at stays selectable even when no layout offers it.
  const componentIdOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...subformComponentIds, subformComponentId]),
  );

  return (
    <StudioSuggestion
      creatable
      description={t('process_editor.configuration_panel_subform_pdf_component_id_description')}
      emptyText={t('process_editor.configuration_panel_subform_pdf_no_component_to_select')}
      error={isTouched && !subformComponentId && t('validation_errors.required')}
      label={t('process_editor.configuration_panel_subform_pdf_component_id_label')}
      multiple={false}
      onBlur={() => setIsTouched(true)}
      onSelectedChange={(item: StudioSuggestionItem | null) => onChange(item?.value ?? '')}
      // `null` rather than `undefined`, which Suggestion treats as uncontrolled.
      selected={
        subformComponentId ? { value: subformComponentId, label: subformComponentId } : null
      }
    >
      {componentIdOptions.map((componentId) => (
        <StudioSuggestion.Option key={componentId} label={componentId} value={componentId}>
          {componentId}
        </StudioSuggestion.Option>
      ))}
    </StudioSuggestion>
  );
};
