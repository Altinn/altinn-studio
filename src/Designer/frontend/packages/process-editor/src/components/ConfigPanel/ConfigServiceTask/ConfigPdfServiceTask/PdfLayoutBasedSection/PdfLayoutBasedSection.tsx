import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Combobox } from '@digdir/designsystemet-react';
import { StudioButton, StudioCard, StudioTextfield } from '@studio/components';
import { PencilIcon } from '@studio/icons';
import { useBpmnContext } from '../../../../../contexts/BpmnContext';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';
import { useCurrentLayoutSet } from '../useCurrentLayoutSet';
import classes from './PdfLayoutBasedSection.module.css';

export const PdfLayoutBasedSection = (): React.ReactElement => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { org, app } = useStudioEnvironmentParams();
  const { bpmnDetails } = useBpmnContext();
  const { addLayoutSet, layoutSets, allDataModelIds = [] } = useBpmnApiContext();
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const { currentLayoutSet } = useCurrentLayoutSet();

  const [newLayoutSetName, setNewLayoutSetName] = useState('');
  const [newLayoutSetNameError, setNewLayoutSetNameError] = useState('');
  const [selectedValue, setSelectedValue] = useState<string[]>([]);

  if (currentLayoutSet) {
    return (
      <div>
        <StudioButton
          onClick={() => navigate(`/${org}/${app}/ui-editor/layoutSet/${currentLayoutSet.id}`)}
          icon={<PencilIcon />}
        >
          {t('process_editor.configuration_panel_pdf_layout_set_link')}
        </StudioButton>
      </div>
    );
  }

  const selectedDataModelId = selectedValue[0];

  const handleCreateLayoutSet = (): void => {
    if (!newLayoutSetName || !selectedDataModelId || newLayoutSetNameError) return;

    addLayoutSet({
      layoutSetIdToUpdate: newLayoutSetName,
      taskType: 'pdf',
      layoutSetConfig: {
        id: newLayoutSetName,
        dataType: selectedDataModelId,
        tasks: [bpmnDetails.id],
      },
    });
  };

  const handleLayoutSetNameChange = (value: string): void => {
    setNewLayoutSetName(value);
    setNewLayoutSetNameError(validateLayoutSetName(value, layoutSets));
  };

  return (
    <StudioCard className={classes.createLayoutSet}>
      <StudioTextfield
        label={t('process_editor.configuration_panel_pdf_layout_set_name_label')}
        description={t('process_editor.configuration_panel_pdf_layout_set_name_description')}
        value={newLayoutSetName}
        error={newLayoutSetNameError}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleLayoutSetNameChange(e.target.value)
        }
      />

      <Combobox
        label={t('process_editor.configuration_panel_pdf_select_data_model_label')}
        value={selectedValue}
        description={t('process_editor.configuration_panel_pdf_select_data_model_description')}
        size='small'
        onValueChange={setSelectedValue}
      >
        <Combobox.Empty>
          {t('process_editor.configuration_panel_pdf_no_data_models')}
        </Combobox.Empty>
        {allDataModelIds.map((option) => (
          <Combobox.Option value={option} key={option}>
            {option}
          </Combobox.Option>
        ))}
      </Combobox>

      <StudioButton
        onClick={handleCreateLayoutSet}
        variant='primary'
        disabled={!newLayoutSetName || !selectedDataModelId || !!newLayoutSetNameError}
      >
        {t('process_editor.configuration_panel_pdf_create_button')}
      </StudioButton>
    </StudioCard>
  );
};
