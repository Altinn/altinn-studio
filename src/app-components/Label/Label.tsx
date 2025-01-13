import React from 'react';
import type { JSX, PropsWithChildren, ReactElement } from 'react';

import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/app-components/Label/Label.module.css';
import type { IGridStyling } from 'src/layout/common.generated';

type LabelProps = {
  label: string | ReactElement | undefined;
  htmlFor?: DesignsystemetLabelProps['htmlFor'];
  required?: boolean;
  requiredIndicator?: JSX.Element;
  optionalIndicator?: ReactElement;
  help?: ReactElement;
  description?: ReactElement;
  className?: string;
  grid?: IGridStyling;
  style?: DesignsystemetLabelProps['style'];
};

export function Label({
  label,
  htmlFor,
  required,
  requiredIndicator,
  optionalIndicator,
  help,
  description,
  className,
  grid,
  style,
  children,
}: PropsWithChildren<LabelProps>) {
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
              weight='medium'
              size='md'
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
}
