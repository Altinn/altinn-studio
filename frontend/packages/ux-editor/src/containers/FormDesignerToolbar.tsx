import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { StudioButton, StudioCheckbox, StudioParagraph, StudioSwitch } from '@studio/components';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { useTranslation } from 'react-i18next';
import { HelpText } from '@digdir/designsystemet-react';
import { FeedbackModal } from './DesignView/AddItem/FeedbackModal';
import { ThumbDownFillIcon, ThumbDownIcon, ThumbUpFillIcon, ThumbUpIcon } from '@studio/icons';

export const FormDesignerToolbar = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery?.data?.sets;
  const [newComponentView, setNewComponentView] = React.useState(
    shouldDisplayFeature('addComponentModal'),
  );
  const [betterOrWorse, setBetterOrWorse] = React.useState<'better' | 'worse' | null>(null);

  const toggleComponentFeatureFlag = () => {
    if (newComponentView) {
      removeFeatureFlagFromLocalStorage('addComponentModal');
    } else {
      addFeatureFlagToLocalStorage('addComponentModal');
    }
    setNewComponentView(!newComponentView);
    window.location.reload();
  };

  const setBetter = () => {
    setBetterOrWorse('better');
  };

  const setWorse = () => {
    setBetterOrWorse('worse');
  };

  const unsetBetterOrWorse = () => {
    setBetterOrWorse(null);
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
        {newComponentView && (
          <FeedbackModal
            heading='Gi tilbakemelding'
            triggerButtonText='Gi tilbakemelding'
            closeButtonText='Lukk'
          >
            <StudioParagraph>
              Hva syns du om den nye visningen for å legge til komponenter?
            </StudioParagraph>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
              {betterOrWorse !== 'better' && (
                <StudioButton
                  variant='tertiary'
                  size='lg'
                  icon={<ThumbUpIcon />}
                  onClick={setBetter}
                />
              )}
              {betterOrWorse === 'better' && (
                <StudioButton
                  variant='tertiary'
                  size='lg'
                  icon={<ThumbUpFillIcon />}
                  onClick={unsetBetterOrWorse}
                />
              )}
              {betterOrWorse !== 'worse' && (
                <StudioButton
                  variant='tertiary'
                  size='lg'
                  icon={<ThumbDownIcon />}
                  onClick={setWorse}
                />
              )}
              {betterOrWorse === 'worse' && (
                <StudioButton
                  variant='tertiary'
                  size='lg'
                  icon={<ThumbDownFillIcon />}
                  onClick={unsetBetterOrWorse}
                />
              )}
            </div>
            {betterOrWorse === 'better' && (
              <StudioCheckbox.Group
                onChange={(value: string[]) => console.log('updated value: ', value)}
                legend='Hva likte du bedre med den nye visningen?'
              >
                <StudioCheckbox value='oversiktlig'>Det var mer oversiktlig</StudioCheckbox>
                <StudioCheckbox value='raskere'>Det var raskere å bruke</StudioCheckbox>
                <StudioCheckbox value='enklere'>Det var enklere å bruke</StudioCheckbox>
              </StudioCheckbox.Group>
            )}
            {betterOrWorse === 'worse' && (
              <StudioCheckbox.Group
                onChange={(value: string[]) => console.log('updated value: ', value)}
                legend='Hva likte du dårligere med den nye visningen?'
              >
                <StudioCheckbox value='oversiktlig'>Det var mindre oversiktlig</StudioCheckbox>
                <StudioCheckbox value='raskere'>Det tok mer tid å bruke</StudioCheckbox>
                <StudioCheckbox value='enklere'>Det var vanskeligere å bruke</StudioCheckbox>
              </StudioCheckbox.Group>
            )}
          </FeedbackModal>
        )}
      </div>
    </section>
  );
};
