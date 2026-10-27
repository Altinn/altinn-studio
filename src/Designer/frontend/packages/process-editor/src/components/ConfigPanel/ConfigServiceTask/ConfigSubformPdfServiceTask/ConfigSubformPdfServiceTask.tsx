import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioButton, StudioList, StudioParagraph } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { FilenameTextResource } from '../FilenameTextResource';
import { useSubformPdfConfig } from './useSubformPdfConfig';
import { useCopiedSubformUiFolder } from './useCopiedSubformUiFolder';
import { SubformUiFolderField } from './SubformUiFolderField';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { layoutSets } = useBpmnApiContext();
  const { bpmnDetails } = useBpmnContext();
  const {
    subformUiFolder,
    subformComponentId,
    filenameTextResourceId,
    setSubformUiFolder,
    setFilenameTextResourceId,
  } = useSubformPdfConfig();

  const subformUiFolders = (layoutSets ?? [])
    .filter((layoutSet) => layoutSet.type === 'subform')
    .map((layoutSet) => layoutSet.id);

  // A task set up with a Subform component opened the subform through a copy of it in the task's UI folder.
  const copiedSubformUiFolder = useCopiedSubformUiFolder(
    bpmnDetails.id,
    subformUiFolder ? '' : subformComponentId,
  );
  const suggestedSubformUiFolder = subformUiFolders.find(
    (uiFolder) => uiFolder === copiedSubformUiFolder,
  );

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <div className={sharedClasses.group}>
          <SubformUiFolderField
            subformUiFolder={subformUiFolder}
            subformUiFolders={subformUiFolders}
            onChange={setSubformUiFolder}
          />
          {suggestedSubformUiFolder && (
            <StudioAlert data-color='info'>
              <StudioParagraph data-size='sm'>
                {t('process_editor.configuration_panel_subform_pdf_ui_folder_suggestion', {
                  componentId: subformComponentId,
                  uiFolder: suggestedSubformUiFolder,
                })}
              </StudioParagraph>
              <StudioButton onClick={() => setSubformUiFolder(suggestedSubformUiFolder)}>
                {t('process_editor.configuration_panel_subform_pdf_ui_folder_suggestion_button', {
                  uiFolder: suggestedSubformUiFolder,
                })}
              </StudioButton>
            </StudioAlert>
          )}
        </div>
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
