import { UserFeedback } from '../interfaces/UserFeedback';

export type EmailFeedbackTypes = 'serviceDesk' | 'serviceOwner';

const feedbackTypeMap: Record<EmailFeedbackTypes, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
  serviceOwner: 'mailto:tjenesteeier@altinn.no',
};

export class EmailFeedbackImpl implements UserFeedback {
  public getFeedbackUrl(feedbackType: EmailFeedbackTypes = 'serviceOwner'): string {
    return feedbackTypeMap[feedbackType];
  }
}
