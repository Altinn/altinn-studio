import type { PropsWithChildren } from 'react';
import React from 'react';
import classes from './LibraryHeader.module.css';
import { studioBetaTagClasses, StudioHeading } from '@studio/components-legacy';
import { BookIcon } from '@studio/icons';
import cn from 'classnames';

export type LibraryHeaderProps = PropsWithChildren<{}>;

export function LibraryHeader({ children }: LibraryHeaderProps): React.ReactElement {
  return (
    <div className={classes.libraryHeading}>
      <BookIcon className={classes.headingIcon} />
      <StudioHeading size='small' className={cn(classes.headingText, studioBetaTagClasses.isBeta)}>
        {children}
      </StudioHeading>
    </div>
  );
}
