import { StudioBreadcrumbs as StudioBreadcrumbsParent } from './StudioBreadcrumbs';
import { StudioBreadcrumbsItem } from './StudioBreadcrumbsItem';
import { StudioBreadcrumbsLink } from './StudioBreadcrumbsLink';
import { StudioBreadcrumbsList } from './StudioBreadcrumbsList';

export const StudioBreadcrumbs = Object.assign(StudioBreadcrumbsParent, {
  List: StudioBreadcrumbsList,
  Item: StudioBreadcrumbsItem,
  Link: StudioBreadcrumbsLink,
});

StudioBreadcrumbs.List.displayName = 'StudioBreadcrumbs.List';
StudioBreadcrumbs.Item.displayName = 'StudioBreadcrumbs.Item';
StudioBreadcrumbs.Link.displayName = 'StudioBreadcrumbs.Link';

export type { StudioBreadcrumbsProps } from './StudioBreadcrumbs';
export type { StudioBreadcrumbsListProps } from './StudioBreadcrumbsList';
export type { StudioBreadcrumbsItemProps } from './StudioBreadcrumbsItem';
export type { StudioBreadcrumbsLinkProps } from './StudioBreadcrumbsLink';
export { StudioBreadcrumbsList, StudioBreadcrumbsItem, StudioBreadcrumbsLink };
