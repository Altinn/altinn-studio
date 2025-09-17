import React from 'react';
import type { ReactNode } from 'react';
import { StudioDialog, StudioHeading } from '@studio/components';
import classes from './ResourceAdmDialogContent.module.css';

interface ResourceAdmDialogContentProps {
  heading: ReactNode;
  children: ReactNode | ReactNode[];
  footer: ReactNode;
}

export const ResourceAdmDialogContent = ({
  heading,
  children,
  footer,
}: ResourceAdmDialogContentProps) => {
  return (
    <>
      <StudioDialog.Block>
        <StudioHeading level={1} data-size='xs'>
          {heading}
        </StudioHeading>
      </StudioDialog.Block>
      <StudioDialog.Block>{children}</StudioDialog.Block>
      <StudioDialog.Block className={classes.ResourceAdmDialogContentFooter}>
        {footer}
      </StudioDialog.Block>
    </>
  );
};
