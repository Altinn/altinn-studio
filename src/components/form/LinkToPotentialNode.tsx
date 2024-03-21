import React from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { SearchParams } from 'src/hooks/useNavigatePage';
import { useResolvedNode } from 'src/utils/layout/NodesContext';

/**
 * This component is used to navigate to a potential node. If the node it is supposed
 * to navigate to does not exist, the link will not replace the current page with the
 * page it is supposed to navigate to.
 * @param props
 * @constructor
 */
export const LinkToPotentialNode = (props: LinkProps) => {
  const [_url, queryParams] = props.to.toString().split('?') ?? [];
  const url = new URLSearchParams(queryParams);
  const resolvedNode = useResolvedNode(url.get(SearchParams.FocusComponentId));
  const nodeExists = resolvedNode != null;
  return (
    <Link
      {...props}
      replace={!nodeExists}
    ></Link>
  );
};
