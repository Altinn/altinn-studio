import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import {
  StudioAlert,
  StudioList,
  StudioParagraph,
  StudioRadio,
  StudioRadioGroup,
  useStudioRadioGroup,
} from '@studio/components';
import classes from './ConfigPdfServiceTask.module.css';
import {
  isVersionEqualOrGreater,
  MINIMUM_APPLIB_VERSION_FOR_PDF_SERVICE_TASK,
  MINIMUM_APP_FRONTEND_VERSION_FOR_PDF_SERVICE_TASK,
} from '../../../../utils/processEditorUtils';
import { useCurrentLayoutSet } from './useCurrentLayoutSet';
import { PdfLayoutBasedSection } from './PdfLayoutBasedSection';
import { PdfAutomaticTaskSelection } from './PdfAutomaticTaskSelection';
import { PdfFilenameTextResource } from './PdfFilenameTextResource';

type PdfMode = 'automatic' | 'layout-based';

export const ConfigPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { appVersion } = useBpmnContext();
  const { deleteLayoutSet } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();

  const initialMode: PdfMode = currentLayoutSet ? 'layout-based' : 'automatic';
  const [pdfMode, setPdfMode] = useState<PdfMode>(initialMode);

  // Used to force-reset radio value if user cancels confirm when toggling away from layout-based
  const setValueRef = useRef<((value: string) => void) | null>(null);

  const handlePdfModeChange = (value: string): void => {
    const newMode = value as PdfMode;

    if (pdfMode === 'layout-based' && newMode === 'automatic' && currentLayoutSet) {
      const confirmed = window.confirm(
        t('process_editor.configuration_panel_pdf_mode_change_to_automatic_confirm'),
      );

      if (confirmed) {
        deleteLayoutSet({ layoutSetIdToUpdate: currentLayoutSet.id });
        setPdfMode(newMode);
      } else {
        setTimeout(() => setValueRef.current?.(pdfMode), 0);
      }
      return;
    }

    setPdfMode(newMode);
  };

  const { getRadioProps, setValue } = useStudioRadioGroup({
    value: pdfMode,
    onChange: handlePdfModeChange,
  });

  setValueRef.current = (value: string) => {
    setValue(value);
  };

  if (
    !isVersionEqualOrGreater(appVersion.backendVersion, MINIMUM_APPLIB_VERSION_FOR_PDF_SERVICE_TASK)
  ) {
    return (
      <div className={classes.pdfConfig}>
        <StudioAlert data-color='warning'>
          <StudioParagraph data-size='sm'>
            {t('process_editor.palette_pdf_service_task_version_error', {
              version: MINIMUM_APPLIB_VERSION_FOR_PDF_SERVICE_TASK,
            })}
          </StudioParagraph>
        </StudioAlert>
      </div>
    );
  }

  if (
    !isVersionEqualOrGreater(
      appVersion.frontendVersion,
      MINIMUM_APP_FRONTEND_VERSION_FOR_PDF_SERVICE_TASK,
    )
  ) {
    return (
      <div className={classes.pdfConfig}>
        <StudioAlert data-color='warning'>
          <StudioParagraph data-size='sm'>
            {t('process_editor.palette_pdf_service_task_frontend_version_error', {
              version: MINIMUM_APP_FRONTEND_VERSION_FOR_PDF_SERVICE_TASK,
            })}
          </StudioParagraph>
        </StudioAlert>
      </div>
    );
  }

  return (
    <StudioList.Unordered className={classes.pdfConfig}>
      <StudioList.Item>
        <div className={classes.container}>
          <StudioRadioGroup
            legend={t('process_editor.configuration_panel_pdf_mode')}
            description={t('process_editor.configuration_panel_pdf_mode_description')}
          >
            <StudioRadio
              label={t('process_editor.configuration_panel_pdf_mode_automatic')}
              {...getRadioProps({ value: 'automatic' })}
            />
            <StudioRadio
              label={t('process_editor.configuration_panel_pdf_mode_layout_based')}
              {...getRadioProps({ value: 'layout-based' })}
            />
          </StudioRadioGroup>

          {pdfMode === 'layout-based' && <PdfLayoutBasedSection />}
          {pdfMode === 'automatic' && <PdfAutomaticTaskSelection />}
        </div>
      </StudioList.Item>

      <StudioList.Item>
        <PdfFilenameTextResource />
      </StudioList.Item>
    </StudioList.Unordered>
  );
};
