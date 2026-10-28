import { type GetInTouchProvider } from '../interfaces/GetInTouchProvider';

type PhoneChannel = 'emergencyPhone';

const phoneChannelMap: Record<PhoneChannel, string> = {
  emergencyPhone: 'tel:94490002',
};

export class PhoneContactProvider implements GetInTouchProvider<PhoneChannel> {
  public buildContactUrl(selectedChannel: PhoneChannel): string {
    return phoneChannelMap[selectedChannel];
  }
}
