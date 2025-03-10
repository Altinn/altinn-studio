import type { ReactElement } from 'react';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FeedbackFormImpl } from '@studio/feedback-form';

/**
 * This is a feedback form to gather feedback on the new design for adding components.
 * It uses the FeedbackForm component from the @studio/feedback-form package.
 * The form is temporary, and will be removed once the new design is fully tested, or we decide to go in a different direction.
 * As such, all texts are hardcoded in Norwegian, to avoid adding unnecessary translations.
 * @returns The FeedbackForm component.
 */
export function FeedbackForm(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const feedbackForm = new FeedbackFormImpl({
    id: 'add-component-poc-feedback',
    submitPath: submitFeedbackPath(org, app),
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description:
      'Hei! Så bra at du har testet det nye designet for å legge til komponenter! Vi vil gjerne høre hva du synes.',
    disclaimer:
      'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
    position: 'fixed',
    questions: [
      {
        id: 'bedreJaNei',
        type: 'yesNo',
        questionText: 'Likte du dette designet bedre?',
        buttonLabels: {
          yes: 'Ja',
          no: 'Nei',
        },
      },
      {
        id: 'kommentar',
        type: 'text',
        questionText: 'Har du kommentarer eller forslag til forbedringer?',
      },
    ],
  });

  return feedbackForm.getFeedbackForm();
}
