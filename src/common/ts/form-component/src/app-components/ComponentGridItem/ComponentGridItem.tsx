import type { HTMLAttributes, PropsWithChildren, Ref } from 'react';

import { Flex } from '@app/form-component/app-components/Flex/Flex';
import cn from 'classnames';
import type { IGridStyling } from '@app/form-component/app-components/Flex/Flex';

import classes from './ComponentGridItem.module.css';

export type IComponentGridItemProps = PropsWithChildren<
  {
    /** The component's width in the page's 12-column layout. */
    size?: IGridStyling;
    /** How many of the component's 12 columns its label takes. Below 12, the label sits beside the field. */
    labelGrid?: IGridStyling;
    ref?: Ref<HTMLDivElement>;
  } & HTMLAttributes<HTMLDivElement>
>;

/**
 * Wraps a form component and sets how many of a row's 12 columns it takes, per screen size. Components share a row
 * until their widths add up to more than 12, and the next one starts a new row.
 */
export function ComponentGridItem({
  size,
  labelGrid,
  className,
  children,
  ...rest
}: IComponentGridItemProps) {
  return (
    <Flex
      {...rest}
      item
      container
      size={size}
      className={cn(classes.container, labelGridClasses(labelGrid), className)}
    >
      {children}
    </Flex>
  );
}

function labelGridClasses(labelGrid: IGridStyling | undefined) {
  return {
    [classes.xs]: isPartialWidth(labelGrid?.xs),
    [classes.sm]: isPartialWidth(labelGrid?.sm),
    [classes.md]: isPartialWidth(labelGrid?.md),
    [classes.lg]: isPartialWidth(labelGrid?.lg),
  };
}

function isPartialWidth(size: IGridStyling['xs']): boolean {
  return typeof size === 'number' && size < 12;
}
