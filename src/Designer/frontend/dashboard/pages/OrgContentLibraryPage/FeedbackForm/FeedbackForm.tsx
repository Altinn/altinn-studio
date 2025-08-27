import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { type FeedbackFormConfig, FeedbackFormImpl } from 'libs/studio-feedback-form/src';
import { submitFeedbackPath } from 'app-shared/api/paths';
import { useSelectedContext } from '../../../hooks/useSelectedContext';

export function FeedbackForm(): ReactElement {
  const feedbackForm = useFeedbackForm();
  return feedbackForm.getFeedbackForm();
}

function useFeedbackForm(): FeedbackFormImpl {
  const orgName = useSelectedContext();

  const config: FeedbackFormConfig = useMemo(() => {
    const repository = `${orgName}-content`;
    const submitPath = submitFeedbackPath(orgName, repository);

    return {
      id: 'organisasjonsbibliotek',
      submitPath,
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
  }, [orgName]);

  return useMemo(() => new FeedbackFormImpl(config), [config]);
}
