import React from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { useIsHiddenPage } from 'src/features/form/layout/PageNavigationContext';
import { useNavigatePage } from 'src/hooks/useNavigatePage';

type Props = LinkProps & { children?: React.ReactNode };

/**
 * This component is used to navigate to a potential page. If the page it is supposed
 * to navigate to does not exist or the page is hidden, the link will turn into pure text.
 * @param props
 * @constructor
 */
export const LinkToPotentialPage = (props: Props) => {
  const parts = props.to.toString().split('/') ?? [];
  const page = parts[parts.length - 1];

  const isHiddenPage = useIsHiddenPage();
  const { isValidPageId } = useNavigatePage();

  const shouldShowLink = isValidPageId(page) && !isHiddenPage(page);

  if (shouldShowLink) {
    return <Link {...props} />;
  }

  if (isHiddenPage(page)) {
    window.logWarnOnce(
      `linkToPage points to a page that is hidden. The link is therefore rendered as pure text. Page you tried to link to: ${page}`,
    );
  } else if (!isValidPageId(page)) {
    window.logWarnOnce(
      `linkToPage points to a page that does not exist. The link is therefore rendered as pure text. Page you tried to link to: ${page}`,
    );
  }

  return <>{props.children}</>;
};
