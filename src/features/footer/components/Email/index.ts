import { FooterComponent } from 'src/features/footer/components';
import { FooterEmail } from 'src/features/footer/components/Email/FooterEmail';
import type { IFooterEmailComponent } from 'src/features/footer/components/Email/types';

export class FooterEmailComponent extends FooterComponent<IFooterEmailComponent> {
  protected renderComponent = FooterEmail;
}
