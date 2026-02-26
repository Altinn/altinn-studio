import type { PageName } from './PageName';

export type ContentLibraryRouter = {
  location: PageName;
  navigate: (page: PageName) => void;
  renderLink: (
    page: PageName,
    props: React.HTMLAttributes<HTMLAnchorElement>,
  ) => React.ReactElement;
};
