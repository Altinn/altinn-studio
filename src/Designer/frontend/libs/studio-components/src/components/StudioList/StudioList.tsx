import type {
  ListItemProps,
  ListOrderedProps,
  ListUnorderedProps,
} from '@digdir/designsystemet-react';
import { List } from '@digdir/designsystemet-react';
import { StudioListRoot } from './StudioListRoot';
import { StudioHeading, type StudioHeadingProps } from '../StudioHeading';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

type StudioListComponent = typeof List & {
  Root: typeof StudioListRoot;
  Heading: typeof StudioHeading;
};

export const StudioList: StudioListComponent = {
  ...List,
  Root: StudioListRoot,
  Heading: StudioHeading,
};

StudioList.Root.displayName = 'StudioList.Root';
StudioList.Item.displayName = 'StudioList.Item';
StudioList.Ordered.displayName = 'StudioList.OrderedList';
StudioList.Unordered.displayName = 'StudioList.UnorderedList';

export type { StudioListRootProps } from './StudioListRoot';

export type StudioListItemProps = WithoutAsChild<ListItemProps>;
export type StudioListUnorderedProps = WithoutAsChild<ListUnorderedProps>;
export type StudioListOrderedProps = WithoutAsChild<ListOrderedProps>;
export type StudioListHeadingProps = StudioHeadingProps;
