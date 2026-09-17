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
import { SubformComponentIdField } from './SubformComponentIdField';
import { SubformPdfLayoutSetSection } from './SubformPdfLayoutSetSection';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { availableDataTypeIds } = useBpmnApiContext();
  const {
    subformComponentId,
    subformDataTypeId,
    filenameTextResourceId,
    setSubformComponentId,
    setSubformDataTypeId,
    setFilenameTextResourceId,
  } = useSubformPdfConfig();
  const [isDataTypeIdTouched, setIsDataTypeIdTouched] = useState(false);

  // A data type the task already points at stays selectable even when the app no longer has it.
  const dataTypeOptions: string[] = ArrayUtils.removeDuplicates(
    ArrayUtils.removeEmptyStrings([...(availableDataTypeIds ?? []), subformDataTypeId]),
  );

  const handleDataTypeChange = (item: StudioSuggestionItem | null): void => {
    setIsDataTypeIdTouched(true);
    setSubformDataTypeId(item?.value ?? '');
  };

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <StudioFormGroup
          className={sharedClasses.group}
          description={t('process_editor.configuration_panel_subform_pdf_description')}
          legend={t('process_editor.configuration_panel_subform_pdf_legend')}
          required
          tagText={t('general.required')}
        >
          <StudioSuggestion
            description={t('process_editor.configuration_panel_subform_pdf_data_type_description')}
            emptyText={t('process_editor.configuration_panel_subform_pdf_no_data_type_to_select')}
            error={isDataTypeIdTouched && !subformDataTypeId && t('validation_errors.required')}
            label={t('process_editor.configuration_panel_subform_pdf_data_type_label')}
            multiple={false}
            onBlur={() => setIsDataTypeIdTouched(true)}
            onSelectedChange={handleDataTypeChange}
            // `null` rather than `undefined`, which Suggestion treats as uncontrolled.
            selected={
              subformDataTypeId ? { value: subformDataTypeId, label: subformDataTypeId } : null
            }
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
        <SubformPdfLayoutSetSection />
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
