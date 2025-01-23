import React, { type ReactElement } from 'react';
import { StudioHeading, StudioList } from '@studio/components';

type SectionProps = {
  title: stirng;
  children: React.ReactNode;
};
export const Section = ({ title, children }: SectionProps): ReactElement => (
  <>
    <StudioHeading level={3} size='2xs' spacing>
      {title}
    </StudioHeading>
    <StudioList.Root size='sm'>
      <StudioList.Unordered>{children}</StudioList.Unordered>
    </StudioList.Root>
  </>
);
