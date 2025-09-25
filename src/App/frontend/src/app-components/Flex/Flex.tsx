import React, { forwardRef } from 'react';
import type { CSSProperties, ElementType, PropsWithChildren } from 'react';

import cn from 'classnames';

import classes from 'src/app-components/Flex/Flex.module.css';
import type { IGridStyling } from 'src/layout/common.generated';

type Spacing = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

type Props = PropsWithChildren<{
  className?: string;
  size?: IGridStyling;
  spacing?: Spacing;
  direction?: CSSProperties['flexDirection'];
  justifyContent?: CSSProperties['justifyContent'];
  alignItems?: CSSProperties['alignItems'];
  component?: ElementType;
  container?: boolean;
  item?: boolean;
  flexWrap?: CSSProperties['flexWrap'];
}> &
  React.HTMLAttributes<HTMLDivElement>;

export const Flex = forwardRef<HTMLDivElement, Props>(
  (
    {
      id,
      children,
      className,
      spacing,
      direction = 'row',
      justifyContent = 'start',
      alignItems,
      flexWrap = 'wrap',
      style,
      size,
      item,
      component = 'div',
      container,
      ...rest
    },
    ref,
  ) => {
    const xsClass = size?.xs ? classes[`col-xs-${size?.xs ?? 12}`] : '';
    const smClass = size?.sm ? classes[`col-sm-${size.sm}`] : '';
    const mdClass = size?.md ? classes[`col-md-${size.md}`] : '';
    const lgClass = size?.lg ? classes[`col-lg-${size.lg}`] : '';
    const spacingClass = container && spacing ? classes[`spacing-${spacing}`] : '';
    const Tag = component;

    const styles: CSSProperties | undefined = container
      ? {
          flexDirection: direction,
          flexWrap,
          justifyContent,
          alignItems,
          ...style,
        }
      : style;

    return (
      <Tag
        id={id}
        ref={ref}
        data-testid='altinn-flex'
        className={cn(
          xsClass,
          smClass,
          mdClass,
          lgClass,
          spacingClass,
          className,
          { [classes.item]: item },
          { [classes.container]: container },
        )}
        style={styles}
        {...rest}
      >
        {children}
      </Tag>
    );
  },
);

Flex.displayName = 'Flex';
