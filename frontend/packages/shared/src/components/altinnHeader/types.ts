export type AltinnHeaderVariant = 'regular' | 'preview';

export interface AltinnButtonActionItem {
  title: string;
  menuKey: string;
  path?: (org: string, app: string) => string;
  buttonVariant: 'filled' | 'outline' | 'quiet';
  buttonColor?: 'inverted';
  headerButtonsClasses: any;
  handleClick: () => void;
  inBeta?: boolean;
}
