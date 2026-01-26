import React, { useState, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { Combobox } from '@digdir/designsystemet-react';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioList,
  StudioParagraph,
  StudioProperty,
  StudioRadio,
  StudioRadioGroup,
  StudioTextfield,
  StudioTextResourceAction,
  useStudioRadioGroup,
} from '@studio/components';
import type { StudioTextResourceActionTexts } from '@studio/components';
import { PencilIcon } from '@studio/icons';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import classes from './ConfigPdfServiceTask.module.css';
import { useUpdatePdfConfigTaskIds } from '@altinn/process-editor/hooks/useUpdatePdfConfigTaskIds';
import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useNavigate } from 'react-router-dom';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useStickyBottomScroll } from './useStickyBottomScroll';
import { getAvailableTasks, filterCurrentTaskIds, generateTextResourceId } from './utils';
import {
  isVersionEqualOrGreater,
  MINIMUM_VERSION_FOR_PDF_SERVICE_TASK,
} from '@altinn/process-editor/utils/processEditorUtils';

type PdfMode = 'automatic' | 'layout-based';

export const ConfigPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef, appLibVersion } = useBpmnContext();
  const { addLayoutSet, layoutSets, allDataModelIds, deleteLayoutSet } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { org, app } = useStudioEnvironmentParams();
  const navigate = useNavigate();
  const taskIdsId = useId();
  const updateTaskIds = useUpdatePdfConfigTaskIds();
  const { data: textResourcesData } = useTextResourcesQuery(org, app);
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getAllTasksByType('bpmn:Task');
  const availableTasks = getAvailableTasks(allTasks);
  const availableTaskIds = availableTasks.map((task) => task.id);

  const pdfConfig = bpmnDetails.element.businessObject.extensionElements.values[0].pdfConfig;
  const currentTaskIds = filterCurrentTaskIds(pdfConfig, availableTaskIds);
  const storedFilenameTextResourceId = pdfConfig.filenameTextResourceKey?.value || '';

  const textResources = textResourcesData?.[DEFAULT_LANGUAGE] ?? [];
  const currentLayoutSet = layoutSets.sets.find(
    (layoutSet) => layoutSet.tasks?.[0] === bpmnDetails.id,
  );
  const initialMode: PdfMode = currentLayoutSet ? 'layout-based' : 'automatic';

  const existingDataType = currentLayoutSet?.dataType;
  const dataModelOptionsToSelect: string[] = existingDataType
    ? [...new Set([...allDataModelIds, existingDataType])]
    : allDataModelIds;
  const currentValue = existingDataType ? [existingDataType] : [];

  const [selectedTaskIds, setSelectedTaskIds] = useState(currentTaskIds);
  const [newLayoutSetName, setNewLayoutSetName] = useState('');
  const [newLayoutSetNameError, setNewLayoutSetNameError] = useState('');
  const [pdfMode, setPdfMode] = useState<PdfMode>(initialMode);
  const [isTextResourceEditorOpen, setIsTextResourceEditorOpen] = useState(false);
  const [currentTextResourceId, setCurrentTextResourceId] = useState<string>(
    storedFilenameTextResourceId,
  );
  const [selectedValue, setSelectedValue] = useState(currentValue);

  const setValueRef = useRef<((value: string) => void) | null>(null);

  const handlePdfModeChange = (value: string) => {
    const newMode = value as PdfMode;

    if (pdfMode === 'layout-based' && newMode === 'automatic' && currentLayoutSet) {
      const confirmed = window.confirm(
        t('process_editor.configuration_panel_pdf_mode_change_to_automatic_confirm'),
      );

      if (confirmed) {
        deleteLayoutSet({ layoutSetIdToUpdate: currentLayoutSet.id });
        setPdfMode(newMode);
      } else {
        setTimeout(() => setValueRef.current(pdfMode), 0);
      }
    } else {
      setPdfMode(newMode);
    }
  };

  const { getRadioProps, setValue } = useStudioRadioGroup({
    value: pdfMode,
    onChange: handlePdfModeChange,
  });

  const { ref: textResourceActionRef, onOpen: onOpenTextResourceEditor } =
    useStickyBottomScroll<HTMLDivElement>(isTextResourceEditorOpen);

  setValueRef.current = (value: string) => {
    setValue(value);
  };

  const updateBpmnFilenameTextResourceKey = (textResourceId: string) => {
    if (textResourceId === pdfConfig.filenameTextResourceKey?.value) {
      return;
    }

    const filenameElement = textResourceId
      ? bpmnFactory.create('altinn:FilenameTextResourceKey', {
          value: textResourceId,
        })
      : null;

    modeling.updateModdleProperties(bpmnDetails.element, pdfConfig, {
      filenameTextResourceKey: filenameElement,
    });
  };

  const handleOpenTextResourceEditor = (event: React.MouseEvent<HTMLButtonElement>) => {
    onOpenTextResourceEditor(event.currentTarget);

    if (!storedFilenameTextResourceId) {
      setCurrentTextResourceId(generateTextResourceId());
    } else {
      setCurrentTextResourceId(storedFilenameTextResourceId);
    }
    setIsTextResourceEditorOpen(true);
  };

  const handleTextResourceIdChange = (id: string) => {
    updateBpmnFilenameTextResourceKey(id);
    setCurrentTextResourceId(id);
  };

  const handleValueChange = (id: string, value: string) => {
    upsertTextResource({
      textId: id,
      language: DEFAULT_LANGUAGE,
      translation: value,
    });
  };

  const handleDeleteTextResource = () => {
    updateBpmnFilenameTextResourceKey('');
  };

  const handleTaskIdsChange = (newTaskIds: string[]) => {
    setSelectedTaskIds(newTaskIds);
    updateTaskIds(newTaskIds);
  };

  const handleCreateLayoutSet = () => {
    addLayoutSet({
      layoutSetIdToUpdate: newLayoutSetName,
      taskType: 'pdf',
      layoutSetConfig: {
        id: newLayoutSetName,
        dataType: selectedValue[0],
        tasks: [bpmnDetails.id],
      },
    });
  };

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

  console.log(`APP VERSION: ${appLibVersion}`);
  if (!isVersionEqualOrGreater(appLibVersion, MINIMUM_VERSION_FOR_PDF_SERVICE_TASK)) {
    return (
      <div className={classes.pdfConfig}>
        <StudioAlert data-color='warning'>
          <StudioParagraph data-size='sm'>
            {t('process_editor.palette_pdf_service_task_version_error', {
              version: MINIMUM_VERSION_FOR_PDF_SERVICE_TASK,
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

          {pdfMode === 'layout-based' && (
            <>
              {currentLayoutSet ? (
                <div>
                  <StudioButton
                    onClick={() =>
                      navigate(`/${org}/${app}/ui-editor/layoutSet/${currentLayoutSet.id}`)
                    }
                    icon={<PencilIcon />}
                  >
                    {t('process_editor.configuration_panel_pdf_layout_set_link')}
                  </StudioButton>
                </div>
              ) : (
                <StudioCard className={classes.createLayoutSet}>
                  <StudioTextfield
                    label={t('process_editor.configuration_panel_pdf_layout_set_name_label')}
                    description={t(
                      'process_editor.configuration_panel_pdf_layout_set_name_description',
                    )}
                    value={newLayoutSetName}
                    error={newLayoutSetNameError}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setNewLayoutSetName(e.target.value);
                      setNewLayoutSetNameError(validateLayoutSetName(e.target.value, layoutSets));
                    }}
                  />

                  <Combobox
                    label={t('process_editor.configuration_panel_pdf_select_data_model_label')}
                    value={selectedValue}
                    description={t(
                      'process_editor.configuration_panel_pdf_select_data_model_description',
                    )}
                    size='small'
                    onValueChange={(newValue) => {
                      setSelectedValue(newValue);
                    }}
                  >
                    <Combobox.Empty>
                      {t('process_editor.configuration_panel_pdf_no_data_models')}
                    </Combobox.Empty>
                    {dataModelOptionsToSelect.map((option) => (
                      <Combobox.Option value={option} key={option}>
                        {option}
                      </Combobox.Option>
                    ))}
                  </Combobox>

                  <StudioButton
                    onClick={handleCreateLayoutSet}
                    variant='primary'
                    disabled={!newLayoutSetName || !selectedValue[0] || !!newLayoutSetNameError}
                  >
                    {t('process_editor.configuration_panel_pdf_create_button')}
                  </StudioButton>
                </StudioCard>
              )}
            </>
          )}

          {pdfMode === 'automatic' && (
            <div className={classes.taskIdSelectContainer}>
              <div className={classes.taskIdSelectAndButtons}>
                <Combobox
                  id={taskIdsId}
                  value={selectedTaskIds}
                  size='small'
                  className={classes.taskIdSelect}
                  multiple
                  onValueChange={handleTaskIdsChange}
                  placeholder={t('process_editor.configuration_panel_select_tasks_placeholder')}
                >
                  <Combobox.Empty>
                    {t('process_editor.configuration_panel_no_data_types_to_sign_to_select')}
                  </Combobox.Empty>
                  {availableTasks.map((task) => (
                    <Combobox.Option key={task.id} value={task.id}>
                      {task.name} ({task.id})
                    </Combobox.Option>
                  ))}
                </Combobox>
              </div>
            </div>
          )}
        </div>
      </StudioList.Item>

      <StudioList.Item>
        <div className={classes.createLayoutSet}>
          <StudioParagraph data-size='sm' className={classes.boldFont}>
            {t('process_editor.configuration_panel_filename')}
          </StudioParagraph>

          <StudioParagraph data-size='sm'>
            {t('process_editor.configuration_panel_pdf_filname_description')}
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
      </StudioList.Item>
    </StudioList.Unordered>
  );
};
