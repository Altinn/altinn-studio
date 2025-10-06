import React from 'react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

import { SearchParams } from 'src/core/routing/types';
import { useIsHidden } from 'src/utils/layout/hidden';
import { useExternalItem } from 'src/utils/layout/hooks';
import { splitDashedKey } from 'src/utils/splitDashedKey';

type Props = LinkProps & { children?: React.ReactNode };

/**
 * This component is used to navigate to a potential node. If the node it is supposed
 * to navigate to does not exist or the node is hidden, the link will render as pure
 * text instead of a link.
 * @param props
 * @constructor
 */
export const LinkToPotentialNode = (props: Props) => {
  const to = props.to;
  const searchParams = typeof to === 'string' ? to.split('?').at(1) : to.search;

  const componentId = new URLSearchParams(searchParams).get(SearchParams.FocusComponentId);
  const { baseComponentId } = splitDashedKey(componentId ?? '');
  const component = useExternalItem(baseComponentId);

  const isHidden = useIsHidden(componentId ?? undefined);
  const shouldShowLink = componentId && !isHidden;

  if (shouldShowLink) {
    return <Link {...props} />;
  }

  if (!component) {
    window.logWarnOnce(
      `linkToComponent points to a component that does not exist. The link is therefore rendered as pure text. Component ID you tried to link to: ${componentId} (base id was ${baseComponentId})`,
    );
  } else if (isHidden) {
    window.logWarnOnce(
      `linkToComponent points to a component that is hidden. The link is therefore rendered as pure text. Component ID you tried to link to: ${componentId}`,
    );
  }

  return props.children;
};
