import { useMergeRefs } from '@floating-ui/react';
import { type HTMLAttributes, forwardRef, useEffect, useRef } from 'react';
import React from 'react';

export type StudioBreadcrumbsListProps = HTMLAttributes<HTMLOListElement>;

export const StudioBreadcrumbsList = forwardRef<HTMLOListElement, StudioBreadcrumbsListProps>(
  function BreadcrumbsList(rest, ref) {
    const innerRef = useRef<HTMLOListElement>(null);
    const mergedRefs = useMergeRefs([innerRef, ref]);

    // Set aria-current on last link
    useEffect(() => {
      const links = innerRef.current?.querySelectorAll(':scope > * > *') || [];
      const lastLink = links[links?.length - 1];

      lastLink?.setAttribute('aria-current', 'page');
      return () => lastLink?.removeAttribute('aria-current'); // Remove on re-render as React can re-use DOM elements
    });

    return <ol ref={mergedRefs} {...rest} />;
  },
);
