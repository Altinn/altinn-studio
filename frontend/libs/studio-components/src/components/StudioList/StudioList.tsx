import type {
  ListHeadingProps,
  ListItemProps,
  ListUnorderedProps,
} from '@digdir/designsystemet-react';
import { List } from '@digdir/designsystemet-react';
import { StudioListRoot } from './StudioListRoot';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

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

export type StudioListItemProps = WithoutAsChild<ListItemProps>;
export type StudioListUnorderedProps = WithoutAsChild<ListUnorderedProps>;
export type StudioListOrderedProps = WithoutAsChild<ListUnorderedProps>;
export type StudioListHeadingProps = WithoutAsChild<ListHeadingProps>;
