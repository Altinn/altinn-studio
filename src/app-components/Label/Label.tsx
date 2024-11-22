import React from 'react';
import type { JSX, PropsWithChildren, ReactElement } from 'react';

import { Label as DesignsystemetLabel } from '@digdir/designsystemet-react';
import { Grid, type GridProps } from '@material-ui/core';
import cn from 'classnames';
import type { LabelProps as DesignsystemetLabelProps } from '@digdir/designsystemet-react';

import classes from 'src/app-components/Label/Label.module.css';

type GridSize = Pick<GridProps, 'xs' | 'sm' | 'md' | 'lg' | 'xl'>;

type LabelProps = {
  label: string | undefined;
  optionalIndicator?: ReactElement;
  help?: ReactElement;
  description?: ReactElement;
  className?: string;
  grid?: GridSize;
  required?: boolean;
  requiredIndicator?: JSX.Element;
} & Pick<DesignsystemetLabelProps, 'htmlFor' | 'style'>;

export function Label({
  label,
  required,
  requiredIndicator,
  optionalIndicator,
  help,
  description,
  htmlFor,
  style,
  className,
  grid,
  children,
}: PropsWithChildren<LabelProps>) {
  if (!label) {
    return children;
  }

  return (
    <Grid
      container
      spacing={2}
    >
      <Grid
        item
        {...(grid ?? { xs: 12 })}
      >
        <span className={classes.labelAndDescWrapper}>
          <DesignsystemetLabel
            weight='medium'
            size='md'
            htmlFor={htmlFor}
            className={cn(classes.label, className)}
            style={style}
          >
            <div>
              {label}
              {required && requiredIndicator}
              {!required && optionalIndicator}
            </div>
            {help}
          </DesignsystemetLabel>
          {description && <div className={classes.description}>{description}</div>}
        </span>
      </Grid>
      {children}
    </Grid>
  );
}
