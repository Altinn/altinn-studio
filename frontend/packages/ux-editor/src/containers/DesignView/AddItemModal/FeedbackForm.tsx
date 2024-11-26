import type React from 'react';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { post } from 'app-shared/utils/networking';
import { FeedbackFormImpl } from '@studio/feedback-form';
import { toast } from 'react-toastify';

export function FeedbackForm(): React.ReactNode {
  const { org, app } = useStudioEnvironmentParams();

  const submitFeedback = async (answers: Record<string, string>) => {
    // Using regular axios post rather than a mutation hook, since we are not storing
    // the feedback in the cache, nor do we need to update any state.
    try {
      await post(submitFeedbackPath(org, app), { answers: { ...answers } });
      toast.success('Takk for tilbakemeldingen!');
    } catch (error) {
      console.error('Failed to submit feedback', error);
      toast.error('Noe gikk galt. Vennligst prøv igjen senere.');
    }
  };

  // Using explicit texts here to avoid adding these potentially
  // temporary and unnecessary translations to the translation files.
  const feedbackForm = new FeedbackFormImpl({
    onSubmit: submitFeedback,
    buttonTexts: {
      submit: 'Send',
      trigger: 'Gi tilbakemelding',
      close: 'Lukk',
    },
    heading: 'Gi tilbakemelding',
    description: 'Vi ønsker å vite hva du synes om den nye løsningen.',
    position: 'inline',
    questions: [
      {
        id: '1',
        type: 'yesNo',
        questionText: 'Var dette bedre enn før?',
        buttonLabels: {
          yes: 'Ja',
          no: 'Nei',
        },
      },
      {
        id: '2',
        type: 'text',
        questionText: 'Hva kan vi gjøre bedre?',
      },
    ],
  });

  return feedbackForm.getFeedbackForm();
}
