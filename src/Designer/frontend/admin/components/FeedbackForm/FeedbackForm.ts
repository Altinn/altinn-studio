import type { ReactElement } from 'react';
import { submitFeedbackOrgPath, submitFeedbackPublishedAppPath } from 'app-shared/api/paths';
import { FeedbackFormImpl } from '@studio/feedback-form';
import { useParams } from 'react-router-dom';

/**
 * This is a feedback form to gather feedback on the new admin page.
 * It uses the FeedbackForm component from the @studio/feedback-form package.
 * The form is temporary, and will be removed once the new design is fully tested, or we decide to go in a different direction.
 * As such, all texts are hardcoded in Norwegian, to avoid adding unnecessary translations.
 * @returns The FeedbackForm component.
 */
export function FeedbackForm(): ReactElement {
  const { org, environment, app } = useParams() as {
    org: string;
    environment?: string;
    app?: string;
  };

  const submitPath =
    environment && app
      ? submitFeedbackPublishedAppPath(org, environment, app)
      : submitFeedbackOrgPath(org);

  const feedbackForm = new FeedbackFormImpl({
    id: 'admin-feedback',
    submitPath,
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description:
      'Hei! Så bra at du har testet det nye admin-verktøyet! Vi vil gjerne høre hva du synes.',
    disclaimer:
      'Merk at KI-verktøy kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
    position: 'fixed',
    questions: [
      {
        id: 'kommentar',
        type: 'text',
        questionText: 'Har du kommentarer eller forslag til forbedringer?',
      },
    ],
  });

  return feedbackForm.getFeedbackForm();
}
