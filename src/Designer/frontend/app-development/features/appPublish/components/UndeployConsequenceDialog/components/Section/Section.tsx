import React, { type ReactElement } from 'react';
import { StudioHeading, StudioList } from '@studio/components';
import classes from './Section.module.css';

type SectionProps = {
  title: string;
  children: React.ReactNode;
};
export const Section = ({ title, children }: SectionProps): ReactElement => (
  <div className={classes.section}>
    <StudioHeading level={3} data-size='2xs' spacing className={classes.heading}>
      {title}
    </StudioHeading>
    <StudioList.Root data-size='sm'>
      <StudioList.Unordered>{children}</StudioList.Unordered>
    </StudioList.Root>
  </div>
);
