import type { ReactElement } from 'react';
import { type FeedbackFormConfig, FeedbackFormImpl } from '@studio/feedback-form';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useParams } from 'react-router-dom';

export function FeedbackForm(): ReactElement {
  const { selectedContext } = useParams();

  const getFormContent = (): FeedbackFormConfig => {
    return {
      id: 'organisasjonsbibliotek',
      submitPath: submitFeedbackPath(selectedContext, 'ttd-content'),
      buttonTexts: {
        submit: 'Send',
        trigger: 'Gi tilbakemelding',
        close: 'Lukk',
      },
      heading: 'Gi tilbakemelding om biblioteket',
      description:
        'Vi vil gjerne høre hva du synes om kodelisteverktøyet i organisasjonsbiblioteket.',
      disclaimer:
        'Merk at kunstig intelligens kan bli brukt til å analysere svarene. Påse at du ikke inkluderer personopplysninger i dine svar.',
      position: 'fixed',
      questions: [
        {
          id: 'kommentar',
          type: 'text',
          questionText:
            'Har du kommentarer eller forslag til forbedringer knyttet til kodelister i organisasjonsbiblioteket?',
        },
      ],
    };
  };

  const feedbackForm = new FeedbackFormImpl(getFormContent());

  return feedbackForm.getFeedbackForm();
}
