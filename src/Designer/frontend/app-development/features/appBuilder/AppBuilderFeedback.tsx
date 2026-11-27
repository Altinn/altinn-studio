import type { ReactElement } from 'react';
import { FeedbackFormImpl } from '@designer/feedback-form';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

/**
 * A feedback form for the app builder, shown to those who have turned on its feature flag.
 * The form is temporary, and will be removed once we have gathered enough feedback.
 * As such, all texts are hardcoded in Norwegian, to avoid adding unnecessary translations.
 */
export function AppBuilderFeedback(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const feedbackForm = new FeedbackFormImpl({
    id: 'app-builder-feedback',
    submitPath: submitFeedbackPath(org, app),
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description:
      'Hei! Så bra at du har testet den nye måten å lage apper på. Vi vil gjerne høre hva du synes.',
    disclaimer:
      'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
    position: 'fixed',
    questions: [
      {
        id: 'nyttigJaNei',
        type: 'yesNo',
        questionText: 'Gjorde dette det enklere å lage appen?',
        buttonLabels: {
          yes: 'Ja',
          no: 'Nei',
        },
      },
      {
        id: 'kommentar',
        type: 'text',
        questionText: 'Hva fungerte bra, og hva bør vi forbedre?',
      },
    ],
  });

  return feedbackForm.getFeedbackForm();
}
