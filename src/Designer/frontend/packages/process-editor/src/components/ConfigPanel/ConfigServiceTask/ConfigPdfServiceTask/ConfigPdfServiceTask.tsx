import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { StudioList, StudioRadio, StudioRadioGroup } from '@studio/components';
import classes from './ConfigPdfServiceTask.module.css';
import sharedClasses from '../ConfigServiceTask.module.css';
import { useCurrentLayoutSet } from '../../../../hooks/useCurrentLayoutSet';
import { PdfLayoutBasedSection } from './PdfLayoutBasedSection';
import { PdfAutomaticTaskSelection } from './PdfAutomaticTaskSelection';
import { FilenameTextResource } from '../FilenameTextResource';
import { usePdfConfig } from './usePdfConfig';

type PdfMode = 'automatic' | 'layout-based';

export const ConfigPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { deleteLayoutSet } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const { storedFilenameTextResourceId, updateFilenameTextResourceKey } = usePdfConfig();

  const initialMode: PdfMode = currentLayoutSet ? 'layout-based' : 'automatic';
  const [pdfMode, setPdfMode] = useState<PdfMode>(initialMode);

  function handlePdfModeChange(newMode: PdfMode): void {
    if (pdfMode === 'layout-based' && newMode === 'automatic' && currentLayoutSet) {
      const confirmed = window.confirm(
        t('process_editor.configuration_panel_pdf_mode_change_to_automatic_confirm'),
      );

      if (!confirmed) return;

      deleteLayoutSet({ layoutSetIdToUpdate: currentLayoutSet.id });
    }

    setPdfMode(newMode);
  }

  return (
    <StudioList.Unordered className={sharedClasses.taskConfigList}>
      <StudioList.Item>
        <div className={classes.container}>
          <StudioRadioGroup
            legend={t('process_editor.configuration_panel_pdf_mode')}
            description={t('process_editor.configuration_panel_pdf_mode_description')}
          >
            <StudioRadio
              label={t('process_editor.configuration_panel_pdf_mode_automatic')}
              value='automatic'
              checked={pdfMode === 'automatic'}
              onChange={() => handlePdfModeChange('automatic')}
            />
            <StudioRadio
              label={t('process_editor.configuration_panel_pdf_mode_layout_based')}
              value='layout-based'
              checked={pdfMode === 'layout-based'}
              onChange={() => handlePdfModeChange('layout-based')}
            />
          </StudioRadioGroup>

          {pdfMode === 'layout-based' && <PdfLayoutBasedSection />}
          {pdfMode === 'automatic' && <PdfAutomaticTaskSelection />}
        </div>
      </StudioList.Item>

      <StudioList.Item>
        <FilenameTextResource
          textResourceId={storedFilenameTextResourceId}
          onTextResourceIdChange={updateFilenameTextResourceKey}
          textResourceIdPrefix='pdf-filename'
        />
      </StudioList.Item>
    </StudioList.Unordered>
  );
};
