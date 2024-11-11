import React from 'react';
import { EditLayoutSet } from './EditLayoutSet';
import type { ComponentType } from 'app-shared/types/ComponentType';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import type { IGenericEditComponent } from '../../../../components/config/componentConfig';
import { DefinedLayoutSet } from './EditLayoutSet/DefinedLayoutSet/DefinedLayoutSet';
import { StudioButton } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PencilIcon } from '@studio/icons';
import { useAppContext } from '@altinn/ux-editor/hooks';
import classes from './EditLayoutSetForSubform.module.css';

export const EditLayoutSetForSubform = <T extends ComponentType>({
  handleComponentChange,
  component,
}: IGenericEditComponent<T>): React.ReactElement => {
  const { setSelectedFormLayoutSetName } = useAppContext();
  const { t } = useTranslation();

  const existingLayoutSetForSubform = component['layoutSet'];
  if (existingLayoutSetForSubform) {
    return (
      <>
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
      </>
    );
  }

  return <EditLayoutSet handleComponentChange={handleComponentChange} component={component} />;
};
