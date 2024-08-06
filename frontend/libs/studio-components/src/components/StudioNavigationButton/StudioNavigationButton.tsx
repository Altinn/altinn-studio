import React, { type HTMLAttributes, type ReactElement, type ComponentType } from 'react';
import classes from './StudioNavigationButton.module.css';
import { Tag } from '@digdir/designsystemet-react';

export type StudioNavigationLinkComponentProps = HTMLAttributes<HTMLAnchorElement> & {
  link: string;
  text: string;
};

export type StudioNavigationButtonProps = {
  LinkComponent: ComponentType<StudioNavigationLinkComponentProps>;
  isBeta?: boolean;
  text: string;
  link: string;
  onClick?: () => void;
};

export const StudioNavigationButton = ({
  LinkComponent,
  isBeta,
  text,
  link,
  onClick,
}: StudioNavigationButtonProps): ReactElement => {
  return (
    <>
      <LinkComponent text={text} link={link} />
      {isBeta && (
        <Tag color='info' size='small' className={classes.betaTag}>
          Beta
        </Tag>
      )}
    </>
  );
};
