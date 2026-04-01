import type { MessageBoxConfig } from 'src/features/applicationMetadata/types';

export class MessageBoxConfigEvaluator {
  public static isHiddenFromInbox(messageBoxConfig?: MessageBoxConfig): boolean {
    if (!messageBoxConfig?.hideSettings) {
      return false;
    }
    return 'hideAlways' in messageBoxConfig.hideSettings && messageBoxConfig.hideSettings.hideAlways;
  }
}
