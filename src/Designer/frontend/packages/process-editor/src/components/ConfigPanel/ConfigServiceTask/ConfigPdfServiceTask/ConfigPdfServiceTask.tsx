import React, { useState, useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { StudioModeler } from '../../../../utils/bpmnModeler/StudioModeler';
import { Combobox, Label } from '@digdir/designsystemet-react';
import {
  StudioButton,
  StudioDisplayTile,
  StudioList,
  StudioParagraph,
  StudioRadio,
  StudioRadioGroup,
  StudioTextResourceInput,
  StudioTextfield,
  useStudioRadioGroup,
} from '@studio/components';
import type { TextResourceInputTexts } from '@studio/components';
import { ArrowRightIcon } from '@studio/icons';
import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import classes from './ConfigPdfServiceTask.module.css';
import { useUpdatePdfConfigTaskIds } from '@altinn/process-editor/hooks/useUpdatePdfConfigTaskIds';
import { useBpmnApiContext } from '@altinn/process-editor/contexts/BpmnApiContext';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { Link } from 'react-router-dom';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

type PdfMode = 'automatic' | 'layout-based';

export const ConfigPdfServiceTask = (): React.ReactElement => {
  const { t } = useTranslation();
  const { bpmnDetails, modelerRef } = useBpmnContext();
  const { addLayoutSet, layoutSets, allDataModelIds, deleteLayoutSet } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const taskIdsId = useId();
  const updateTaskIds = useUpdatePdfConfigTaskIds();
  const { org, app } = useStudioEnvironmentParams();

  const { data: textResourcesData } = useTextResourcesQuery(org, app);
  const textResources = textResourcesData?.[DEFAULT_LANGUAGE] ?? [];
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);

  const studioModeler = new StudioModeler();
  const allTasks = studioModeler.getAllTasksByType('bpmn:Task');
  const availableTasks = allTasks.map((task) => ({
    id: task.id,
    name: task.businessObject?.name || '',
  }));

  const pdfConfig = bpmnDetails.element.businessObject.extensionElements.values[0].pdfConfig;
  const currentTaskIds =
    (pdfConfig.autoPdfTaskIds?.taskIds as [{ value: string }])
      ?.filter((taskId) => availableTasks.map((task) => task.id).includes(taskId.value))
      .map((taskId) => taskId.value) || [];

  const [filenameTextResourceId, setFilenameTextResourceId] = useState<string>(
    pdfConfig.filenameTextResourceKey?.value || '',
  );
  const [selectedTaskIds, setSelectedTaskIds] = useState(currentTaskIds);

  const [newLayoutSetName, setNewLayoutSetName] = useState('');
  const [newLayoutSetNameError, setNewLayoutSetNameError] = useState('');
  const [dataModelError, setDataModelError] = useState('');

  const currentLayoutSet = layoutSets.sets.filter(
    (layoutSet) => layoutSet.tasks[0] === bpmnDetails.id,
  )[0];

  const initialMode: PdfMode = currentLayoutSet ? 'layout-based' : 'automatic';
  const [pdfMode, setPdfMode] = useState<PdfMode>(initialMode);

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

  setValueRef.current = (value: string) => {
    setValue(value);
  };

  const modelerInstance = modelerRef.current;
  const modeling: Modeling = modelerInstance.get('modeling');
  const bpmnFactory: BpmnFactory = modelerInstance.get('bpmnFactory');

  const handleFilenameIdChange = (textResourceId: string) => {
    setFilenameTextResourceId(textResourceId);

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

  const handleCreateTextResource = (textResource: { id: string; value: string }) => {
    if (!textResource.value) {
      return;
    }
    upsertTextResource({
      textId: textResource.id,
      language: DEFAULT_LANGUAGE,
      translation: textResource.value,
    });

    handleFilenameIdChange(textResource.id);
  };

  const handleUpdateTextResource = (textResource: { id: string; value: string }) => {
    upsertTextResource({
      textId: textResource.id,
      language: DEFAULT_LANGUAGE,
      translation: textResource.value,
    });

    handleFilenameIdChange(textResource.id);
  };

  const textResourceInputTexts: TextResourceInputTexts = {
    editValue: '',
    emptyTextResourceList: '',
    idLabel: 'Valgt tekstnøkkel:',
    search: '',
    textResourcePickerLabel: '',
    noTextResourceOptionLabel: '',
    valueLabel: '',
  };

  const handleTaskIdsChange = (newTaskIds: string[]) => {
    setSelectedTaskIds(newTaskIds);
    updateTaskIds(newTaskIds);
  };

  const existingDataType = currentLayoutSet?.dataType;

  const dataModelOptionsToSelect: string[] = existingDataType
    ? [...new Set([...allDataModelIds, existingDataType])]
    : allDataModelIds;

  const currentValue = existingDataType ? [existingDataType] : [];
  const [selectedValue, setSelectedValue] = useState(currentValue);

  const handleCreateLayoutSet = () => {
    if (!newLayoutSetName || !selectedValue[0] || newLayoutSetNameError) {
      if (!selectedValue[0]) {
        setDataModelError(t('process_editor.configuration_panel_pdf_data_model_required'));
      }
      return;
    }

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

  return (
    <StudioList.Ordered className={classes.pdfConfig}>
      <StudioList.Item>
        <div className={classes.container}>
          <StudioRadioGroup legend={t('process_editor.configuration_panel_pdf_mode')}>
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
                  <StudioDisplayTile
                    label={t('process_editor.configuration_panel_pdf_layout_set_label')}
                    value={currentLayoutSet.id}
                    showPadlock={false}
                  />

                  <StudioButton variant='tertiary' icon={<ArrowRightIcon />}>
                    <Link to={`/${org}/${app}/ui-editor/layoutSet/${currentLayoutSet.id}`}>
                      {t('process_editor.configuration_panel_pdf_layout_set_link', {
                        layoutSetId: currentLayoutSet.id,
                      })}
                    </Link>
                  </StudioButton>
                </div>
              ) : (
                <div className={classes.createLayoutSet}>
                  <StudioParagraph data-size='sm' className={classes.boldFont}>
                    {t('process_editor.configuration_panel_pdf_layout_set_required_heading')}
                  </StudioParagraph>

                  <StudioParagraph data-size='sm'>
                    {t('process_editor.configuration_panel_pdf_layout_set_required_description')}
                  </StudioParagraph>

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
                    error={dataModelError}
                    onValueChange={(newValue) => {
                      setSelectedValue(newValue);
                      setDataModelError('');
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
                </div>
              )}
            </>
          )}

          {pdfMode === 'automatic' && (
            <div className={classes.taskIdSelectContainer}>
              <Label size='small' htmlFor={taskIdsId}>
                {t('process_editor.configuration_panel_set_auto_pdf_tasks')}
              </Label>
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

          <StudioTextResourceInput
            currentId={filenameTextResourceId}
            onChangeCurrentId={handleFilenameIdChange}
            onCreateTextResource={handleCreateTextResource}
            onUpdateTextResource={handleUpdateTextResource}
            textResources={textResources}
            texts={textResourceInputTexts}
          />
        </div>
      </StudioList.Item>
    </StudioList.Ordered>
  );
};
