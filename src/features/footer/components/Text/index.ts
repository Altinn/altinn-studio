import { FooterComponent } from 'src/features/footer/components';
import { FooterText } from 'src/features/footer/components/Text/FooterText';
import type { IFooterTextComponent } from 'src/features/footer/components/Text/types';

export class FooterTextComponent extends FooterComponent<IFooterTextComponent> {
  protected renderComponent = FooterText;
}
