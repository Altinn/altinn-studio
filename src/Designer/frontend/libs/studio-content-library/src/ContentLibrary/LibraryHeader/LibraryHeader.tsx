import type { PropsWithChildren } from 'react';
import React from 'react';
import classes from './LibraryHeader.module.css';
import { StudioHeading, studioBetaTagClasses } from '@studio/components';
import { BookIcon } from '@studio/icons';
import cn from 'classnames';

export type LibraryHeaderProps = PropsWithChildren<{}>;

export function LibraryHeader({ children }: LibraryHeaderProps): React.ReactElement {
  return (
    <div className={classes.libraryHeading}>
      <BookIcon className={classes.headingIcon} />
      <StudioHeading level={1} className={cn(classes.headingText, studioBetaTagClasses.isBeta)}>
        {children}
      </StudioHeading>
    </div>
  );
}
