import type React from 'react';
import { FeedbackFormImpl } from '@studio/feedback-form';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export function LayoutPageOverviewFeedback(): React.ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const feedbackForm = new FeedbackFormImpl({
    id: 'utforming-overview',
    submitPath: submitFeedbackPath(org, app),
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description: 'Hei! Vi vil gjerne høre hva du syns om den nye oversiktssiden på Utforming.',
    disclaimer:
      'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
    position: 'fixed',
    questions: [
      {
        id: 'likerUtformingJaNei',
        type: 'yesNo',
        questionText: 'Likte du den nye oversiktssiden på Utforming?',
        buttonLabels: {
          yes: 'Ja',
          no: 'Nei',
        },
      },
      {
        id: 'kommentar',
        type: 'text',
        questionText:
          'Kommenter gjerne om du synes det var enklere å forstå og bruke, eller gi oss forslag til forbedringer.',
      },
    ],
  });

  return feedbackForm.getFeedbackForm();
}
