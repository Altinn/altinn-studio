import React from 'react';
import type { PropsWithChildren, ReactNode } from 'react';

import { Flex, type IGridStyling } from '@app/form-component/app-components/Flex';

export interface IComponentStructureProps {
  /** Id for the outer content wrapper element. */
  id?: string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  className?: string;
  style?: React.CSSProperties;
  /** Validation messages to render. When provided, a dedicated validation area is rendered. */
  validationMessages?: ReactNode;
}

type GridSize = IGridStyling['xs'];

const toNumber = (grid: GridSize | undefined): number | undefined =>
  typeof grid === 'number' ? grid : undefined;

function componentWithValidationSpan(
  innerGrid: IGridStyling | undefined,
  validationGrid: IGridStyling | undefined,
): { containerSpan: IGridStyling; innerSpan: IGridStyling; validationSpan: IGridStyling } {
  const containerSpan: IGridStyling = {};
  const innerSpan: IGridStyling = {};
  const validationSpan: IGridStyling = {};

  for (const breakpoints of ['xs', 'sm', 'md', 'lg', 'xl'] as const) {
    const innerGridNumber = toNumber(innerGrid?.[breakpoints]);
    const validationGridNumber = toNumber(validationGrid?.[breakpoints]);
    if (innerGridNumber == null && validationGridNumber == null) {
      continue;
    }

    const maxWidth = Math.max(innerGridNumber ?? 0, validationGridNumber ?? 0);
    containerSpan[breakpoints] = maxWidth as GridSize;
    innerSpan[breakpoints] =
      innerGridNumber != null ? (Math.round((innerGridNumber / maxWidth) * 12) as GridSize) : 12;
    validationSpan[breakpoints] =
      validationGridNumber != null
        ? (Math.round((validationGridNumber / maxWidth) * 12) as GridSize)
        : 12;
  }

  return { containerSpan, innerSpan, validationSpan };
}

/**
 * Lays out the children (layout component) and its validation
 * messages in a responsive grid.
 */
export function ComponentStructure({
  id,
  innerGrid,
  validationGrid,
  className,
  style,
  validationMessages,
  children,
}: PropsWithChildren<IComponentStructureProps>) {
  const { containerSpan, innerSpan, validationSpan } = componentWithValidationSpan(
    innerGrid,
    validationGrid,
  );

  return (
    <Flex id={id} className={className} size={{ xs: 12, ...containerSpan }} item container>
      <Flex item size={{ xs: 12, ...innerSpan }} style={style}>
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
