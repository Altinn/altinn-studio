import { FooterComponent } from 'src/features/footer/components';
import { FooterLink } from 'src/features/footer/components/Link/FooterLink';
import type { IFooterLinkComponent } from 'src/features/footer/components/Link/types';

export class FooterLinkComponent extends FooterComponent<IFooterLinkComponent> {
  protected renderComponent = FooterLink;
}
