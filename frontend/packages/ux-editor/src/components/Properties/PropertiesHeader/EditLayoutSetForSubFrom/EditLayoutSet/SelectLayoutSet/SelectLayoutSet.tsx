import React from 'react';
import { StudioNativeSelect } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './SelectLayoutSet.module.css';
import { EditLayoutSetButtons } from '@altinn/ux-editor/components/Properties/PropertiesHeader/EditLayoutSetForSubFrom/EditLayoutSet/SelectLayoutSet/EditLayoutSetButtons/EditLayoutSetButtons';

type SelectLayoutSetProps = {
  layoutSetsActingAsSubForm: string[];
  existingLayoutSetForSubForm: string;
  onUpdateLayoutSet: (layoutSetId: string) => void;
  onSetLayoutSetSelectVisible: (visible: boolean) => void;
};

export const SelectLayoutSet = ({
  layoutSetsActingAsSubForm,
  existingLayoutSetForSubForm,
  onUpdateLayoutSet,
  onSetLayoutSetSelectVisible,
}: SelectLayoutSetProps) => {
  const { t } = useTranslation();
  const emptyOptionText = t('ux_editor.component_properties.subform.choose_layout_set');

  const handleSelectChange = (layoutSetId: string) => {
    if (layoutSetId === emptyOptionText) {
      handleDeleteConnection();
    } else onUpdateLayoutSet(layoutSetId);
    onSetLayoutSetSelectVisible(false);
  };

  const handleDeleteConnection = () => {
    onUpdateLayoutSet(undefined);
  };

  return (
    <div className={classes.selectLayoutSet}>
      <StudioNativeSelect
        size='small'
        onChange={({ target }) => handleSelectChange(target.value)}
        label={t('ux_editor.component_properties.subform.choose_layout_set_label')}
        defaultValue={existingLayoutSetForSubForm}
        onBlur={() => onSetLayoutSetSelectVisible(false)}
      >
        <option>{emptyOptionText}</option>
        {layoutSetsActingAsSubForm.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </StudioNativeSelect>
      <EditLayoutSetButtons
        onClose={() => onSetLayoutSetSelectVisible(false)}
        onDelete={handleDeleteConnection}
      />
    </div>
  );
};
