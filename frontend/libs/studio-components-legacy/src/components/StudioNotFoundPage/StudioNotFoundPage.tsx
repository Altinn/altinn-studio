/// <reference types="vite/client" />
import PCImage404Url from './images/PCImage404.png';
import type { HTMLAttributes, ReactNode } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioNotFoundPage.module.css';
import cn from 'classnames';
import { Heading, Link } from '@digdir/designsystemet-react';

type StudioNotFoundPageProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  body: ReactNode;
  redirectHref: string;
  redirectLinkText: string;
};

/**
 * @component
 *    Displays the 404 - Not found page in studio
 */
export const StudioNotFoundPage = forwardRef<HTMLDivElement, StudioNotFoundPageProps>(
  ({ className, title, body, redirectHref, redirectLinkText, ...rest }, ref) => {
    return (
      <div ref={ref} className={cn(className, classes.wrapper)} {...rest}>
        <div className={classes.contentWrapper}>
          <img src={PCImage404Url} alt='' data-testid='404-error' />
          <div className={classes.textWrapper}>
            <Heading level={1} size='large'>
              {title}
            </Heading>
            <div className={classes.body}>{body}</div>
            <Link href={redirectHref} className={classes.link}>
              {redirectLinkText}
            </Link>
          </div>
        </div>
      </div>
    );
  },
);

StudioNotFoundPage.displayName = 'StudioNotFoundPage';
