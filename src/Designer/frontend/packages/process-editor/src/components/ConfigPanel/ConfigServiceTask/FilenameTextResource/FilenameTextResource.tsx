import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioFieldset, StudioProperty, StudioTextResourceAction } from '@studio/components';
import type { StudioTextResourceActionTexts } from '@studio/components';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { generateTextResourceId } from './generateTextResourceId';
import classes from './FilenameTextResource.module.css';

type TextResource = { id: string; value: string };

export type FilenameTextResourceProps = {
  /** The text resource id currently stored in the bpmn, or an empty string when there is none. */
  textResourceId: string;
  /** Called with the new id, or an empty string when the developer removes the filename. */
  onTextResourceIdChange: (textResourceId: string) => void;
  /** The prefix a newly written text resource id gets, so each panel's filenames are recognizable. */
  textResourceIdPrefix: string;
};

/**
 * The filename of a generated pdf, as a text resource. Shared by the pdf and subform pdf panels,
 * which store the same value under different config nodes and therefore own the write themselves.
 */
export const FilenameTextResource = ({
  textResourceId,
  onTextResourceIdChange,
  textResourceIdPrefix,
}: FilenameTextResourceProps): React.ReactElement => {
  const { t } = useTranslation();

  const { org, app } = useStudioEnvironmentParams();
  const { data: textResourcesData } = useTextResourcesQuery(org, app);
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  const [isTextResourceEditorOpen, setIsTextResourceEditorOpen] = useState(false);
  const [currentTextResourceId, setCurrentTextResourceId] = useState<string>(textResourceId);

  const textResources: TextResource[] = textResourcesData?.[DEFAULT_LANGUAGE] ?? [];

  const displayTextResourceValue =
    textResources.find((tr) => tr.id === textResourceId)?.value ?? '';

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

  const handleTextResourceIdChange = (id: string): void => {
    onTextResourceIdChange(id);
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
    onTextResourceIdChange('');
    setCurrentTextResourceId('');
  };

  return (
    <StudioFieldset
      legend={t('process_editor.configuration_panel_filename')}
      description={t('process_editor.configuration_panel_pdf_filename_description')}
    >
      {isTextResourceEditorOpen ? (
        <div className={classes.filenameContent}>
          <StudioTextResourceAction
            textResources={textResources}
            textResourceId={currentTextResourceId}
            generateId={() => generateTextResourceId(textResourceIdPrefix)}
            setIsOpen={setIsTextResourceEditorOpen}
            handleIdChange={handleTextResourceIdChange}
            handleValueChange={handleValueChange}
            handleRemoveTextResource={handleDeleteTextResource}
            texts={texts}
          />
        </div>
      ) : (
        <div className={classes.filenameContent}>
          <StudioProperty.Button
            onClick={() => setIsTextResourceEditorOpen(true)}
            property={t('process_editor.configuration_panel_pdf_filename_label')}
            value={displayTextResourceValue}
          />
        </div>
      )}
    </StudioFieldset>
  );
};
