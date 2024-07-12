import { UserFeedback } from '../interfaces/UserFeedback';

export type EmailFeedbackTypes = 'serviceDesk';

const feedbackTypeMap: Record<EmailFeedbackTypes, string> = {
  serviceDesk: 'mailto:servicedesk@altinn.no',
};

export class EmailFeedbackImpl implements UserFeedback {
  public getFeedbackUrl(feedbackType: EmailFeedbackTypes = 'serviceDesk'): string {
    return feedbackTypeMap[feedbackType];
  }
}
