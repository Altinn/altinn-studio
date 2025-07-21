import { StudioCard as Root } from './StudioCard';
import { Block } from './Block';

type StudioCardComponent = typeof Root & {
  Block: typeof Block;
};

const StudioCard = Root as StudioCardComponent;

StudioCard.Block = Block;

export type { StudioCardProps } from './StudioCard';
export type { BlockProps as StudioCardBlockProps } from './Block';
export { StudioCard };
