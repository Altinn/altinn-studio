import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import { StudioParagraph, StudioProperty, StudioTextResourceAction } from '@studio/components';
import type { StudioTextResourceActionTexts } from '@studio/components';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { usePdfConfig } from './usePdfConfig';
import { useStickyBottomScroll } from './useStickyBottomScroll';
import { generateTextResourceId } from './utils';
import classes from './ConfigPdfServiceTask.module.css';

type TextResource = { id: string; value: string };

export const PdfFilenameTextResource = (): React.ReactElement => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const { data: textResourcesData } = useTextResourcesQuery(org, app);
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { pdfConfig, storedFilenameTextResourceId } = usePdfConfig();

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const textResources: TextResource[] = textResourcesData?.[DEFAULT_LANGUAGE] ?? [];

  const [isTextResourceEditorOpen, setIsTextResourceEditorOpen] = useState(false);
  const [currentTextResourceId, setCurrentTextResourceId] = useState<string>(
    storedFilenameTextResourceId,
  );

  const { ref: textResourceActionRef, onOpen: onOpenTextResourceEditor } =
    useStickyBottomScroll<HTMLDivElement>(isTextResourceEditorOpen);

  const displayTextResourceValue =
    textResources.find((tr) => tr.id === storedFilenameTextResourceId)?.value ?? '';

  const texts: StudioTextResourceActionTexts = {
    cardLabel: `${t('process_editor.configuration_panel_pdf_filename_label')} (${t('language.' + DEFAULT_LANGUAGE)})`,
    deleteAriaLabel: t('general.delete'),
    saveLabel: t('general.save'),
    cancelLabel: t('general.cancel'),
    pickerLabel: t('process_editor.configuration_panel_pdf_filename_search_label'),
    valueEditorAriaLabel: t('process_editor.configuration_panel_pdf_filename_value_label'),
    valueEditorIdLabel: 'ID:',
    noTextResourceOptionLabel: t(
      'process_editor.configuration_panel_pdf_filename_no_text_resource',
    ),
    tabLabelType: t('process_editor.configuration_panel_pdf_filename_tab_write'),
    tabLabelSearch: t('process_editor.configuration_panel_pdf_filename_tab_search'),
  };

  const updateBpmnFilenameTextResourceKey = (textResourceId: string): void => {
    if (textResourceId === pdfConfig.filenameTextResourceKey?.value) return;

    const filenameElement = textResourceId
      ? bpmnFactory.create('altinn:FilenameTextResourceKey', { value: textResourceId })
      : null;

    modeling.updateModdleProperties(bpmnDetails.element, pdfConfig, {
      filenameTextResourceKey: filenameElement,
    });
  };

  const handleOpenTextResourceEditor = (event: React.MouseEvent<HTMLButtonElement>): void => {
    onOpenTextResourceEditor(event.currentTarget);

    if (!storedFilenameTextResourceId) {
      setCurrentTextResourceId(generateTextResourceId());
    } else {
      setCurrentTextResourceId(storedFilenameTextResourceId);
    }
    setIsTextResourceEditorOpen(true);
  };

  const handleTextResourceIdChange = (id: string): void => {
    updateBpmnFilenameTextResourceKey(id);
    setCurrentTextResourceId(id);
  };

  const handleValueChange = (id: string, value: string): void => {
    upsertTextResource({
      textId: id,
      language: DEFAULT_LANGUAGE,
      translation: value,
    });
  };

  const handleDeleteTextResource = (): void => {
    updateBpmnFilenameTextResourceKey('');
  };

  return (
    <div className={classes.createLayoutSet}>
      <StudioParagraph data-size='sm' className={classes.boldFont}>
        {t('process_editor.configuration_panel_filename')}
      </StudioParagraph>

      <StudioParagraph data-size='sm'>
        {t('process_editor.configuration_panel_pdf_filename_description')}
      </StudioParagraph>

      {isTextResourceEditorOpen ? (
        <div ref={textResourceActionRef}>
          <StudioTextResourceAction
            textResources={textResources}
            textResourceId={currentTextResourceId}
            generateId={generateTextResourceId}
            setIsOpen={setIsTextResourceEditorOpen}
            handleIdChange={handleTextResourceIdChange}
            handleValueChange={handleValueChange}
            handleRemoveTextResource={handleDeleteTextResource}
            texts={texts}
          />
        </div>
      ) : (
        <StudioProperty.Button
          onClick={handleOpenTextResourceEditor}
          property={t('process_editor.configuration_panel_pdf_filename_label')}
          value={displayTextResourceValue}
        />
      )}
    </div>
  );
};
