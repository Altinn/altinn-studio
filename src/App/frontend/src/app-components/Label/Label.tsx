import React, { forwardRef } from 'react';
import type { JSX, PropsWithChildren, ReactElement } from 'react';

import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/app-components/Label/Label.module.css';
import type { IGridStyling } from 'src/layout/common.generated';

type LabelProps = {
  id?: string;
  label: string | ReactElement | undefined;
  htmlFor?: DesignsystemetLabelProps['htmlFor'];
  required?: boolean;
  requiredIndicator?: JSX.Element;
  optionalIndicator?: ReactElement;
  help?: ReactElement;
  description?: ReactElement;
  className?: string;
  grid?: IGridStyling;
  size?: DesignsystemetLabelProps['data-size'];
  style?: DesignsystemetLabelProps['style'];
};

export const Label = forwardRef<HTMLLabelElement, PropsWithChildren<LabelProps>>(function Label(
  {
    id,
    label,
    htmlFor,
    required,
    requiredIndicator,
    optionalIndicator,
    help,
    description,
    className,
    grid,
    size = 'md',
    style,
    children,
  },
  ref,
) {
  if (!label) {
    return children;
  }

  return (
    <Flex
      container
      size={{ xs: 'auto' }}
      spacing={2}
    >
      <Flex
        item
        size={grid ?? { xs: 12 }}
      >
        <span className={classes.labelAndDescWrapper}>
          <span className={classes.labelAndHelpWrapper}>
            <DesignsystemetLabel
              id={id}
              ref={ref}
              weight='medium'
              data-size={size}
              htmlFor={htmlFor}
              className={cn(className, {
                [classes.labelPadding]: !children,
              })}
              style={style}
            >
              {label}
              {required && requiredIndicator}
              {!required && optionalIndicator}
            </DesignsystemetLabel>
            {help}
          </span>
          {description && <div className={classes.description}>{description}</div>}
        </span>
      </Flex>
      {children}
    </Flex>
  );
});
