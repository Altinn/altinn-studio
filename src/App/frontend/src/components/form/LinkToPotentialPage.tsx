import React from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { useNavigatePage } from 'src/hooks/useNavigatePage';
import { useIsHiddenPage } from 'src/utils/layout/hidden';

type Props = LinkProps & { children?: React.ReactNode };

/**
 * This component is used to navigate to a potential page. If the page it is supposed
 * to navigate to does not exist or the page is hidden, the link will turn into pure text.
 */
export const LinkToPotentialPage = (props: Props) => {
  const toStr = typeof props.to === 'string' ? props.to : (props.to?.pathname ?? '');
  const parts = toStr.replace(/\/+$/, '').split('/');
  const lastPart = parts[parts.length - 1] ?? '';
  const page = lastPart.split(/[?#]/)[0];

  const isHiddenPage = useIsHiddenPage(page);
  const { isValidPageId } = useNavigatePage();

  const shouldShowLink = isValidPageId(page) && !isHiddenPage;
  if (shouldShowLink) {
    return <Link {...props} />;
  }

  if (isHiddenPage) {
    window.logWarnOnce(
      `linkToPage points to a page that is hidden. The link is therefore rendered as pure text. Page you tried to link to: ${page}`,
    );
  } else if (!isValidPageId(page)) {
    window.logWarnOnce(
      `linkToPage points to a page that does not exist. The link is therefore rendered as pure text. Page you tried to link to: ${page}`,
    );
  }

  return props.children;
};
