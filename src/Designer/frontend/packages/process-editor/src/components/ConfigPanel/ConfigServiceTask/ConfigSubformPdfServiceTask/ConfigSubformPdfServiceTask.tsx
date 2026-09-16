import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioFormGroup,
  StudioList,
  StudioSuggestion,
  type StudioSuggestionItem,
} from '@studio/components';
import { ArrayUtils } from '@studio/pure-functions';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { FilenameTextResource } from '../FilenameTextResource';
import { useSubformPdfConfig } from './useSubformPdfConfig';
import { useValidateSubformPdfValue } from './useValidateSubformPdfValue';
import { SubformComponentIdField } from './SubformComponentIdField';
import classes from './ConfigSubformPdfServiceTask.module.css';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { availableDataTypeIds } = useBpmnApiContext();
  const { validateRequiredSubformPdfValue } = useValidateSubformPdfValue();
  const {
    subformComponentId,
    subformDataTypeId,
    filenameTextResourceId,
    setSubformComponentId,
    setSubformDataTypeId,
    setFilenameTextResourceId,
  } = useSubformPdfConfig();

  // Both values are unanswered when the panel opens on a task the palette just created. The
  // required tag on the group is what says they must be answered; an error before the field has
  // been touched would only shout at a form nobody has filled in yet.
  const [isDataTypeIdTouched, setIsDataTypeIdTouched] = useState(false);

  // A data type the task already points at is offered even when it is no longer in the app, so
  // that opening the panel cannot quietly drop a value the developer never touched.
  const dataTypeOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...(availableDataTypeIds ?? []), subformDataTypeId]),
  );

  const selectedDataType: StudioSuggestionItem | null = subformDataTypeId
    ? { value: subformDataTypeId, label: subformDataTypeId }
    : null;

  const handleDataTypeChange = (item: StudioSuggestionItem | null): void => {
    setIsDataTypeIdTouched(true);
    setSubformDataTypeId(item?.value ?? '');
  };

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <StudioFormGroup
          className={classes.group}
          description={t('process_editor.configuration_panel_subform_pdf_description')}
          legend={t('process_editor.configuration_panel_subform_pdf_legend')}
          required
          tagText={t('general.required')}
        >
          {/* The data type comes first: it is what Studio derives the component candidates from,
              so answering it is what fills the list below. */}
          <StudioSuggestion
            description={t('process_editor.configuration_panel_subform_pdf_data_type_description')}
            emptyText={t('process_editor.configuration_panel_subform_pdf_no_data_type_to_select')}
            error={isDataTypeIdTouched && validateRequiredSubformPdfValue(subformDataTypeId)}
            filter={() => true}
            label={t('process_editor.configuration_panel_subform_pdf_data_type_label')}
            multiple={false}
            onBlur={() => setIsDataTypeIdTouched(true)}
            onSelectedChange={handleDataTypeChange}
            // `null` rather than `undefined`: Suggestion treats `undefined` as uncontrolled and
            // falls back to the selection it kept itself, so a cleared value would keep showing
            // the old one.
            selected={selectedDataType}
          >
            {dataTypeOptions.map((dataTypeId) => (
              <StudioSuggestion.Option key={dataTypeId} label={dataTypeId} value={dataTypeId}>
                {dataTypeId}
              </StudioSuggestion.Option>
            ))}
          </StudioSuggestion>
          <SubformComponentIdField
            subformComponentId={subformComponentId}
            subformDataTypeId={subformDataTypeId}
            onChange={setSubformComponentId}
          />
        </StudioFormGroup>
      </StudioList.Item>

      <StudioList.Item>
        <FilenameTextResource
          textResourceId={filenameTextResourceId}
          onTextResourceIdChange={setFilenameTextResourceId}
          textResourceIdPrefix='subform-pdf-filename'
        />
      </StudioList.Item>
    </StudioList.Unordered>
  );
};
