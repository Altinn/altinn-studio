import { ReactElement } from 'react';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { post } from 'app-shared/utils/networking';
import { FeedbackFormImpl } from '@studio/feedback-form';
import { toast } from 'react-toastify';

export function FeedbackForm(): ReactElement {
  const { org, app } = useStudioEnvironmentParams();

  const submitFeedback = async (answers: Record<string, string>) => {
    // Using explicit texts here to avoid adding these potentially
    // temporary and unnecessary translations to the translation files.
    try {
      // Using regular axios post rather than a mutation hook, since we are not storing
      // the feedback in the cache, nor are we updating any state.
      await post(submitFeedbackPath(org, app), { answers: { ...answers } });
      toast.success('Takk for tilbakemeldingen!');
    } catch (error) {
      console.error('Failed to submit feedback', error);
      toast.error('Noe gikk galt. Prøv igjen senere.');
    }
  };

  // Using explicit texts here to avoid adding these potentially
  // temporary and unnecessary translations to the translation files.
  const feedbackForm = new FeedbackFormImpl({
    id: 'add-component-poc-feedback',
    onSubmit: submitFeedback,
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description:
      'Hei! Vi ser du tester et nytt design for å legge til komponenter og vil gjerne høre hva du synes!',
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
