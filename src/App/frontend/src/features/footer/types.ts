import type { IFooterEmailComponent } from 'src/features/footer/components/FooterEmail';
import type { IFooterLinkComponent } from 'src/features/footer/components/FooterLink';
import type { IFooterPhoneComponent } from 'src/features/footer/components/FooterPhone';
import type { IFooterTextComponent } from 'src/features/footer/components/FooterText';

export type IFooterIcon = 'information' | 'email' | 'phone';
export type IFooterComponentType = keyof IFooterComponentMap;
export interface IFooterBaseComponent<T extends IFooterComponentType> {
  type: T;
}

export interface IFooterComponentMap {
  Email: IFooterEmailComponent;
  Link: IFooterLinkComponent;
  Phone: IFooterPhoneComponent;
  Text: IFooterTextComponent;
}

export type IFooterComponent<T extends IFooterComponentType> = IFooterComponentMap[T];

export interface IFooterLayout {
  footer: IFooterComponent<IFooterComponentType>[];
}
