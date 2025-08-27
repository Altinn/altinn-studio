import type { ReactElement } from 'react';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { type FeedbackFormConfig, FeedbackFormImpl } from 'libs/studio-feedback-form/src';
import { submitFeedbackPath } from 'app-shared/api/paths';

/**
 * This is a feedback form to gather feedback on the new policy summary.
 * It uses the FeedbackForm component from the @studio/feedback-form package.
 * The form is temporary, and will be removed when we have gathered sufficient feedback.
 * As such, all texts are hardcoded in Norwegian, to avoid adding unnecessary translations.
 * @returns The FeedbackForm component.
 */
export function FeedbackForm(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const getFormContent = (): FeedbackFormConfig => {
    return {
      id: 'policy-summary-feedback',
      submitPath: submitFeedbackPath(org, app),
      buttonTexts: {
        submit: 'Send',
        trigger: 'Gi tilbakemelding',
        close: 'Lukk',
      },
      heading: 'Gi tilbakemelding',
      description: "Vi vil gjerne høre hva du synes om denne visningen av tilganger i app'en.",
      disclaimer:
        'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
      position: 'inline',
      questions: [
        {
          id: 'bedreJaNei',
          type: 'yesNo',
          questionText:
            "Ga denne visningen deg en bedre oversikt over tilgangene som er satt opp i app'en?",
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
    };
  };

  const feedbackForm = new FeedbackFormImpl(getFormContent());

  return feedbackForm.getFeedbackForm();
}
