import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

import { Flex, type IGridStyling } from '@app/form-component/app-components/Flex';

export interface IComponentStructureProps {
  /**
   * Id of the configured component. The outer content wrapper element's DOM id is derived from this
   * as `form-content-${componentId}`, currently only used for e2e tests.
   */
  componentId?: string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /** Class name for the outer container element. */
  className?: string;
  /** Inline style for the inner content wrapper (the element wrapping the children). */
  contentStyle?: React.CSSProperties;
  /** Validation messages to render. When provided, a dedicated validation area is rendered. */
  validationMessages?: ReactNode;
}

type GridSize = NonNullable<IGridStyling['xs']>;

function toWidth(size: GridSize | undefined): number | undefined {
  return typeof size === 'number' ? size : undefined;
}

/**
 * Re-normalizes a column width to a 12-column span within a container `containerWidth` columns wide.
 * Falls back to full width (12) when the width is absent.
 */
function toSpan(width: number | undefined, containerWidth: number): GridSize {
  return width != null ? (Math.round((width / containerWidth) * 12) as GridSize) : 12;
}

function componentWithValidationSpan(
  innerGrid: IGridStyling | undefined,
  validationGrid: IGridStyling | undefined,
): { containerSpan: IGridStyling; innerSpan: IGridStyling; validationSpan: IGridStyling } {
  const containerSpan: IGridStyling = {};
  const innerSpan: IGridStyling = {};
  const validationSpan: IGridStyling = {};

  for (const breakpoint of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    const innerWidth = toWidth(innerGrid?.[breakpoint]);
    const validationWidth = toWidth(validationGrid?.[breakpoint]);
    if (innerWidth == null && validationWidth == null) {
      continue;
    }

    const containerWidth = Math.max(innerWidth ?? 0, validationWidth ?? 0);
    containerSpan[breakpoint] = containerWidth as GridSize;
    innerSpan[breakpoint] = toSpan(innerWidth, containerWidth);
    validationSpan[breakpoint] = toSpan(validationWidth, containerWidth);
  }

  return { containerSpan, innerSpan, validationSpan };
}

/**
 * Lays out the children (layout component) and its validation
 * messages in a responsive grid.
 */
export function ComponentStructure({
  componentId,
  innerGrid,
  validationGrid,
  className,
  contentStyle,
  validationMessages,
  children,
}: PropsWithChildren<IComponentStructureProps>) {
  const { containerSpan, innerSpan, validationSpan } = componentWithValidationSpan(
    innerGrid,
    validationGrid,
  );

  return (
    <Flex
      id={componentId ? `form-content-${componentId}` : undefined}
      className={className}
      size={{ xs: 12, ...containerSpan }}
      item
      container
    >
      <Flex item size={{ xs: 12, ...innerSpan }} style={contentStyle}>
        {children}
      </Flex>
      {validationMessages && (
        <Flex item size={{ xs: 12, ...validationSpan }}>
          {validationMessages}
        </Flex>
      )}
    </Flex>
  );
}
