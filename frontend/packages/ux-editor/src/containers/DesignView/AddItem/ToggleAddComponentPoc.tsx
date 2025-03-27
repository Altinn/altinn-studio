import React from 'react';
import { FeedbackForm } from './FeedbackForm';
import { StudioParagraph, StudioSwitch } from '@studio/components-legacy';
import {
  addFeatureFlagToLocalStorage,
  FeatureFlag,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import { HelpText } from '@digdir/designsystemet-react';
import classes from './ToggleAddComponentPoc.module.css';

/**
 * Component that toggles the AddComponentModal POC and
 * displays the feedback form if the feature flag is enabled
 * NOTE: Since this is a poc, and the switch at some point will be
 * removed,  all texts are explicit in this file, rather than being
 * fetched from the translation files.
 * @returns The ToggleAddComponentPoc component
 */
export function ToggleAddComponentPoc(): React.ReactElement {
  const toggleComponentModalPocAndReload = () => {
    if (shouldDisplayFeature(FeatureFlag.AddComponentModal)) {
      removeFeatureFlagFromLocalStorage(FeatureFlag.AddComponentModal);
    } else {
      addFeatureFlagToLocalStorage(FeatureFlag.AddComponentModal);
    }
    window.location.reload();
  };
  return (
    <>
      <div className={classes.switchWrapper}>
        <StudioSwitch
          checked={shouldDisplayFeature(FeatureFlag.AddComponentModal)}
          onChange={toggleComponentModalPocAndReload}
          size='sm'
        >
          Prøv nytt design
        </StudioSwitch>
        <HelpText
          size='sm'
          title='Prøv vårt nye design for å legge til komponenter'
          placement='bottom-start'
        >
          <StudioParagraph spacing size='sm'>
            Vi jobber med brukeropplevelsen i Studio. Vil du prøve vårt forslag til nytt design for
            å legge til komponenter?
          </StudioParagraph>
          <StudioParagraph spacing size='sm'>
            Du kan fortelle oss hva du synes om det nye designet ved å trykke på &quot;Gi
            tilbakemelding&quot; nederst til høyre på siden.
          </StudioParagraph>
        </HelpText>
      </div>
      {shouldDisplayFeature(FeatureFlag.AddComponentModal) && <FeedbackForm />}
    </>
  );
}
