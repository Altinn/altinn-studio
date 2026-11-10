import React from 'react';
import { StudioList } from '@studio/components';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { FilenameTextResource } from '../FilenameTextResource';
import { useSubformPdfConfig } from './useSubformPdfConfig';
import { SubformUiFolderField } from './SubformUiFolderField';
import sharedClasses from '../ConfigServiceTask.module.css';

export const ConfigSubformPdfServiceTask = (): React.ReactElement => {
  const { layoutSets } = useBpmnApiContext();
  const { subformUiFolder, filenameTextResourceId, setSubformUiFolder, setFilenameTextResourceId } =
    useSubformPdfConfig();

  const subformUiFolders = (layoutSets ?? [])
    .filter((layoutSet) => layoutSet.type === 'subform')
    .map((layoutSet) => layoutSet.id);

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <SubformUiFolderField
          subformUiFolder={subformUiFolder}
          subformUiFolders={subformUiFolders}
          onChange={setSubformUiFolder}
        />
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
