import React, { useCallback } from 'react';
import type { ChangeEventHandler } from 'react';
import { FeedbackForm } from './FeedbackForm';
import { StudioSwitch } from '@studio/components-legacy';
import { StudioHelpText, StudioParagraph } from '@studio/components';
import { FeatureFlag, useFeatureToggle } from '@studio/feature-flags';
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
  const { isEnabled, toggle } = useFeatureToggle(FeatureFlag.AddComponentModal);

  const handleToggle: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => toggle(e.target.checked),
    [toggle],
  );

  return (
    <>
      <div className={classes.switchWrapper}>
        <StudioSwitch checked={isEnabled} onChange={handleToggle} size='sm'>
          Prøv nytt design
        </StudioSwitch>
        <StudioHelpText
          aria-label='Prøv vårt nye design for å legge til komponenter'
          placement='bottom'
        >
          <StudioParagraph spacing>
            Vi jobber med brukeropplevelsen i Studio. Vil du prøve vårt forslag til nytt design for
            å legge til komponenter?
          </StudioParagraph>
          <StudioParagraph>
            Du kan fortelle oss hva du synes om det nye designet ved å trykke på &quot;Gi
            tilbakemelding&quot; nederst til høyre på siden.
          </StudioParagraph>
        </StudioHelpText>
      </div>
      {isEnabled && <FeedbackForm />}
    </>
  );
}
