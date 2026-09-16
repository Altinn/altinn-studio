import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSuggestion, type StudioSuggestionItem } from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useValidateSubformPdfValue } from '../useValidateSubformPdfValue';
import { useSubformComponentIds } from './useSubformComponentIds';

export type SubformComponentIdFieldProps = {
  /** The component id stored in the bpmn, or an empty string when there is none. */
  subformComponentId: string;
  /** The data type the task is configured with, which the candidates are derived from. */
  subformDataTypeId: string;
  /** Called with the new component id, or an empty string when it is removed. */
  onChange: (subformComponentId: string) => void;
};

/**
 * The Subform component the task generates a pdf from.
 *
 * The field is `creatable`, so the id can always be typed. Studio can only derive the candidates
 * once the task has its own layout set and a data type is chosen, and the layout set is something
 * the developer adds by hand, so an offer is the exception rather than the rule. A picker the
 * developer could not type into would lock them out of a required value.
 *
 * `creatable` is a commit rule rather than an affordance: Suggestion takes the typed text on Enter
 * and draws nothing to say so. With no candidate to offer - the normal state of this field - all
 * the developer would otherwise see is an empty list telling them there is nothing, which reads as
 * a field that rejected the id they just typed. The empty text is therefore where the gesture is
 * named.
 */
export const SubformComponentIdField = ({
  subformComponentId,
  subformDataTypeId,
  onChange,
}: SubformComponentIdFieldProps): React.ReactElement => {
  const { t } = useTranslation();
  const { validateRequiredSubformPdfValue } = useValidateSubformPdfValue();
  const { subformComponentIds } = useSubformComponentIds(subformDataTypeId);

  // The error waits for the field to be touched, so a task the palette just created is marked as
  // required without being reported as wrong.
  const [isTouched, setIsTouched] = useState(false);

  // A component the task already points at is offered even when the derivation does not produce
  // it, so that opening the panel cannot quietly drop a value the developer never touched.
  const componentIdOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...subformComponentIds, subformComponentId]),
  );

  const handleSelectedChange = (item: StudioSuggestionItem | null): void => {
    onChange(item?.value ?? '');
  };

  return (
    <StudioSuggestion
      creatable
      description={t('process_editor.configuration_panel_subform_pdf_component_id_description')}
      emptyText={t('process_editor.configuration_panel_subform_pdf_no_component_to_select')}
      error={isTouched && validateRequiredSubformPdfValue(subformComponentId)}
      filter={() => true}
      label={t('process_editor.configuration_panel_subform_pdf_component_id_label')}
      multiple={false}
      onBlur={() => setIsTouched(true)}
      onSelectedChange={handleSelectedChange}
      // `null` rather than `undefined`: Suggestion treats `undefined` as uncontrolled and falls
      // back to the selection it kept itself, so a cleared value would keep showing the old one.
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
