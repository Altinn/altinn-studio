import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { StudioSwitch } from '@studio/components';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { useTranslation } from 'react-i18next';
import { HelpText } from '@digdir/designsystemet-react';

export const FormDesignerToolbar = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery?.data?.sets;
  const [newComponentView, setNewComponentView] = React.useState(
    shouldDisplayFeature('addComponentModal'),
  );

  const toggleComponentFeatureFlag = () => {
    if (newComponentView) {
      removeFeatureFlagFromLocalStorage('addComponentModal');
    } else {
      addFeatureFlagToLocalStorage('addComponentModal');
    }
    setNewComponentView(!newComponentView);
    window.location.reload();
  };

  return (
    <section className={classes.toolbar}>
      {layoutSetNames && <LayoutSetsContainer />}
      <div className={classes.switchContainer}>
        <StudioSwitch
          defaultChecked={newComponentView}
          onChange={toggleComponentFeatureFlag}
          size='sm'
        >
          {t('ux_editor.top_bar.featureFlag_addComponentModal.title')}
        </StudioSwitch>
        <HelpText
          placement='bottom-end'
          title={t('ux_editor.top_bar.featureFlag_addComponentModal.helpText_label')}
        >
          {t('ux_editor.top_bar.featureFlag_addComponentModal.helpText')}
        </HelpText>
      </div>
    </section>
  );
};
