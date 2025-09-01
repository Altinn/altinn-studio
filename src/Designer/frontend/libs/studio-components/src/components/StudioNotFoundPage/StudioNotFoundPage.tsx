/// <reference types="vite/client" />
import PCImage404Url from './images/PCImage404.png';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioNotFoundPage.module.css';
import cn from 'classnames';
import { StudioHeading } from '../StudioHeading';
import { StudioLink } from '../StudioLink';

type StudioNotFoundPageProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  body: ReactNode;
  redirectHref: string;
  redirectLinkText: string;
};

function StudioNotFoundPage(
  { className, title, body, redirectHref, redirectLinkText, ...rest }: StudioNotFoundPageProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <div ref={ref} className={cn(className, classes.wrapper)} {...rest}>
      <div className={classes.contentWrapper}>
        <img src={PCImage404Url} alt='' data-testid='404-error' />
        <div className={classes.textWrapper}>
          <StudioHeading level={1} data-size='lg'>
            {title}
          </StudioHeading>
          <div className={classes.body}>{body}</div>
          <StudioLink href={redirectHref} className={classes.link}>
            {redirectLinkText}
          </StudioLink>
        </div>
      </div>
    </div>
  );
}

StudioNotFoundPage.displayName = 'StudioNotFoundPage';

const ForwardedStudioNotFoundPage = forwardRef(StudioNotFoundPage);

export { ForwardedStudioNotFoundPage as StudioNotFoundPage };
