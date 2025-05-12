import React from 'react';
import { EditLayoutSet } from './EditLayoutSet';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IGenericEditComponent } from '../../config/componentConfig';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { StudioButton, StudioDivider } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import classes from './EditLayoutSetForSubform.module.css';
import { useAppContext } from '../../../../../hooks/useAppContext';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { setSelectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();

  const existingLayoutSetForSubform = component['layoutSet'];
  if (existingLayoutSetForSubform) {
    return (
      <div className={classes.wrapper}>
        <DefinedLayoutSet existingLayoutSetForSubform={existingLayoutSetForSubform} />
        <StudioButton
          icon={<PencilIcon />}
          onClick={() => setSelectedFormLayoutSetName(existingLayoutSetForSubform)}
          color='second'
          title={t('ux_editor.component_properties.navigate_to_subform_button')}
          className={classes.navigateSubformButton}
        >
          {t('ux_editor.component_properties.navigate_to_subform_button')}
        </StudioButton>
        <StudioDivider color='subtle' />
      </div>
    );
  }

  return <EditLayoutSet handleComponentChange={handleComponentChange} component={component} />;
};
