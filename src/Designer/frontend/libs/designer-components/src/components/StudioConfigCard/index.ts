import { StudioConfigCard as Root } from './StudioConfigCard';
import { StudioConfigCardFooter } from './StudioConfigCardFooter/StudioConfigCardFooter';
import { StudioConfigCardHeader } from './StudioConfigCardHeader/StudioConfigCardHeader';
import { StudioConfigCardBody } from './StudioConfigCardBody/StudioConfigCardBody';

export type StudioConfigCardComponent = typeof Root & {
  Header: typeof StudioConfigCardHeader;
  Body: typeof StudioConfigCardBody;
  Footer: typeof StudioConfigCardFooter;
};

const StudioConfigCard = Root as StudioConfigCardComponent;

StudioConfigCard.Header = StudioConfigCardHeader;
StudioConfigCard.Body = StudioConfigCardBody;
StudioConfigCard.Footer = StudioConfigCardFooter;

export { StudioConfigCard };
