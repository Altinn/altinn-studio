import type {
  ListHeadingProps,
  ListItemProps,
  ListOrderedProps,
  ListUnorderedProps,
} from '@digdir/designsystemet-react';
import { List } from '@digdir/designsystemet-react';
import { StudioListRoot } from './StudioListRoot';

type StudioListComponent = typeof List;

export const StudioList: StudioListComponent = {
  ...List,
  Root: StudioListRoot,
};

StudioList.Root.displayName = 'StudioList.Root';
StudioList.Item.displayName = 'StudioList.Item';
StudioList.Heading.displayName = 'StudioList.Heading';
StudioList.Ordered.displayName = 'StudioList.OrderedList';
StudioList.Unordered.displayName = 'StudioList.UnorderedList';

export type { StudioListRootProps } from './StudioListRoot';

export type StudioListItemProps = ListItemProps;
export type StudioListUnorderedProps = ListUnorderedProps;
export type StudioListOrderedProps = ListOrderedProps;
export type StudioListHeadingProps = ListHeadingProps;
