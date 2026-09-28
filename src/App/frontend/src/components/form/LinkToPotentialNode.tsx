import React from 'react';
import { Link, useLinkClickHandler } from 'react-router';
import type { LinkProps } from 'react-router';

import { SearchParams } from 'src/core/routing/types';
import { withFocusComponentRequestState } from 'src/layout/focusComponent';
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

  const params = new URLSearchParams(searchParams);
  const componentId = params.get(SearchParams.FocusComponentId);
  const cleanTo = withoutFocusComponentParams(to, params);
  const handleInternalClick = useLinkClickHandler(cleanTo, {
    replace: props.replace,
    state: componentId
      ? withFocusComponentRequestState(props.state, {
          nodeId: componentId,
          errorBinding: params.get(SearchParams.FocusErrorBinding),
        })
      : props.state,
    target: props.target,
    preventScrollReset: props.preventScrollReset,
    relative: props.relative,
    viewTransition: props.viewTransition,
  });
  const { baseComponentId } = splitDashedKey(componentId ?? '');
  const component = useExternalItem(baseComponentId);

  const isHidden = useIsHidden(componentId ?? undefined);
  const shouldShowLink = componentId && !isHidden;

  if (shouldShowLink) {
    return (
      <Link
        {...props}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented && !props.reloadDocument) {
            handleInternalClick(event);
          }
        }}
      />
    );
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

function withoutFocusComponentParams(to: LinkProps['to'], params: URLSearchParams): LinkProps['to'] {
  const cleanParams = new URLSearchParams(params);
  cleanParams.delete(SearchParams.FocusComponentId);
  cleanParams.delete(SearchParams.FocusErrorBinding);
  const search = cleanParams.size > 0 ? `?${cleanParams.toString()}` : '';

  if (typeof to !== 'string') {
    return { ...to, search };
  }

  const hashIndex = to.indexOf('#');
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : '';
  const pathAndSearch = hashIndex >= 0 ? to.slice(0, hashIndex) : to;
  const path = pathAndSearch.split('?')[0];
  return `${path}${search}${hash}`;
}
