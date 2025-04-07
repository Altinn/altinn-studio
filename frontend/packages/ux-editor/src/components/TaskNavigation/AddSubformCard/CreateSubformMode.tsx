import React from 'react';
import {
  StudioCard,
  StudioTextfield,
  StudioTabs,
  StudioNativeSelect,
} from '@studio/components-legacy';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import classes from './CreateSubformMode.module.css';
import { CheckmarkIcon, XMarkIcon } from '@studio/icons';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

enum Tabs {
  Choose = 'choose',
  Create = 'create',
}

type SubformCardEditModeProps = {
  setIsCreateSubformMode: (isSubformInEditMode: boolean) => void;
};

export const SubformCardEditMode = ({ setIsCreateSubformMode }: SubformCardEditModeProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const { validateLayoutSetName } = useValidateLayoutSetName();
  const [newSubformNameError, setNewSubformNameError] = React.useState<string>();

  const handleSubformName = (subformName: string) => {
    const subformNameValidation = validateLayoutSetName(subformName, layoutSets);
    setNewSubformNameError(subformNameValidation);
  };

  return (
    <StudioCard className={classes.subformCardEditMode}>
      <StudioCard.Header data-size='xs'>{t('ux_editor.subform')}</StudioCard.Header>
      <StudioTextfield
        label={t('ux_editor.component_properties.subform.created_layout_set_name')}
        size='small'
        error={newSubformNameError}
        className={classes.textField}
        onChange={(e) => handleSubformName(e.target.value)}
      />
      <StudioTabs defaultValue={Tabs.Choose} className={classes.subformTabs}>
        <StudioTabs.List>
          <StudioTabs.Tab value={Tabs.Choose}>Velg</StudioTabs.Tab>
          <StudioTabs.Tab value={Tabs.Create}>Lag ny</StudioTabs.Tab>
        </StudioTabs.List>
        <StudioTabs.Content value={Tabs.Choose} className={classes.tabContent}>
          <StudioNativeSelect
            label={t('ux_editor.component_properties.subform.data_model_binding_label')}
            size='small'
            // options={[]}
            // onChange={handleSelectChange}
            // value={selectedOption}
          />
        </StudioTabs.Content>
        <StudioTabs.Content value={Tabs.Create} className={classes.tabContent}>
          <StudioTextfield
            label={'Navn på datamodell'}
            size='small'
            className={classes.textField}
          />
        </StudioTabs.Content>
      </StudioTabs>
      <div className={classes.buttonContainer}>
        <StudioButton
          disabled={Boolean(newSubformNameError)}
          className={classes.button}
          icon={<CheckmarkIcon />}
          onClick={() => setIsCreateSubformMode(false)}
        >
          {t('general.save')}
        </StudioButton>
        <StudioButton
          variant='secondary'
          className={classes.button}
          icon={<XMarkIcon />}
          onClick={() => setIsCreateSubformMode(false)}
        >
          {t('general.cancel')}
        </StudioButton>
      </div>
    </StudioCard>
  );
};
