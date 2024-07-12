import { UserFeedback } from '../interfaces/UserFeedback';

export type SlackFeedbackTypes = 'product-altinn-studio' | 'altinn';

const SlackFeedbackTypeMap: Record<SlackFeedbackImpl, string> = {
  'product-altinn-studio': 'https://altinn.slack.com/archives/C02EJ9HKQA3',
  altinn: 'https://altinn.slack.com',
};

export class SlackFeedbackImpl implements UserFeedback {
  public getFeedbackUrl(feedbackType: SlackFeedbackTypes = 'product-altinn-studio'): string {
    return SlackFeedbackTypeMap[feedbackType];
  }
}
