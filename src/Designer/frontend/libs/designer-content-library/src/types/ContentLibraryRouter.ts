import type { PageName } from './PageName';

export type ContentLibraryRouter = {
  contactPagePath: string;
  location: PageName;
  navigate: (page: PageName) => void;
  renderLink: (
    page: PageName,
    props: React.HTMLAttributes<HTMLAnchorElement>,
  ) => React.ReactElement;
};
