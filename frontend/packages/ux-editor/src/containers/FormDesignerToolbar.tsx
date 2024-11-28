import React from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import classes from './FormDesignerToolbar.module.css';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { LayoutSetsContainer } from '../components/Elements/LayoutSetsContainer';
import { FeedbackForm } from './DesignView/AddItem/FeedbackForm';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { StudioParagraph, StudioSwitch } from '@studio/components';
import { HelpText } from '@digdir/designsystemet-react';

export const FormDesignerToolbar = () => {
  const { org, app } = useStudioEnvironmentParams();
  const layoutSetsQuery = useLayoutSetsQuery(org, app);
  const layoutSetNames = layoutSetsQuery?.data?.sets;

  const toggleComponentModalPocAndReload = () => {
    if (shouldDisplayFeature('addComponentModal')) {
      removeFeatureFlagFromLocalStorage('addComponentModal');
    } else {
      addFeatureFlagToLocalStorage('addComponentModal');
    }
    window.location.reload();
  };

  return (
    <section className={classes.toolbar}>
      {layoutSetNames && <LayoutSetsContainer />}
      <div style={{ display: 'flex', flexDirection: 'row', gap: 'var(--fds-spacing-2)' }}>
        <StudioSwitch
          checked={shouldDisplayFeature('addComponentModal')}
          onChange={toggleComponentModalPocAndReload}
        >
          Prøv nytt design
        </StudioSwitch>
        <HelpText title='Prøv vårt nye design for å legge til komponenter' placement='bottom-start'>
          <StudioParagraph spacing size='small'>
            Vi jobber med brukeropplevelsen i Studio. Vil du prøve vårt forslag til nytt design for
            å legge til komponenter?
          </StudioParagraph>
          <StudioParagraph spacing size='small'>
            Du kan fortelle oss hva du synes om det nye designet ved å trykke på "Gi tilbakemelding"
            nederst til høyre på siden.
          </StudioParagraph>
        </HelpText>
      </div>
      {shouldDisplayFeature('addComponentModal') && <FeedbackForm />}
    </section>
  );
};
