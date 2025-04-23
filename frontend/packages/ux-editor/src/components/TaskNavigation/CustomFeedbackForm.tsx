import type React from 'react';
import { FeedbackFormImpl } from '@studio/feedback-form';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function CustomFeedbackForm(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const feedbackForm = new FeedbackFormImpl({
    id: 'custom-feedback-form',
    submitPath: submitFeedbackPath(org, app),
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description:
      'Hei! Så bra at du har testet den nye Utforming-siden. Vi vil gjerne vite hva du synes om den.',
    disclaimer:
      'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
    position: 'fixed',
    questions: [
      {
        id: 'likerUtformingJaNei',
        type: 'yesNo',
        questionText: 'Likte du den nye Utforming-siden?',
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
