import { FooterComponent } from 'src/features/footer/components';
import { FooterPhone } from 'src/features/footer/components/Phone/FooterPhone';
import type { IFooterPhoneComponent } from 'src/features/footer/components/Phone/types';

export class FooterPhoneComponent extends FooterComponent<IFooterPhoneComponent> {
  protected renderComponent = FooterPhone;
}
