import { type GetInTouchProvider } from '../interfaces/GetInTouchProvider';

type PhoneChannel = 'phone' | 'emergencyPhone';

const phoneChannelMap: Record<PhoneChannel, string> = {
  phone: 'tel:75006299',
  emergencyPhone: 'tel:94490002',
};

export class PhoneContactProvider implements GetInTouchProvider<PhoneChannel> {
  public buildContactUrl(selectedChannel: PhoneChannel): string {
    return phoneChannelMap[selectedChannel];
  }
}
