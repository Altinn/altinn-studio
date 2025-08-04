import React from 'react';
import { EditLayoutSet } from './EditLayoutSet';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { IGenericEditComponent } from '../../../../components/config/componentConfig';
import { DefinedLayoutSet } from './DefinedLayoutSet/DefinedLayoutSet';
import { StudioButton, StudioDivider } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import classes from './EditLayoutSetForSubform.module.css';
import getLayoutSetPath from '../../../../utils/routeUtils';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useNavigate } from 'react-router-dom';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const navigate = useNavigate();

  const existingLayoutSetForSubform = component['layoutSet'];

  const navigateToSubform = () => {
    navigate(getLayoutSetPath(org, app, existingLayoutSetForSubform));
  };

  if (existingLayoutSetForSubform) {
    return (
      <div className={classes.wrapper}>
        <DefinedLayoutSet existingLayoutSetForSubform={existingLayoutSetForSubform} />
        <StudioButton
          icon={<PencilIcon />}
          onClick={navigateToSubform}
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
