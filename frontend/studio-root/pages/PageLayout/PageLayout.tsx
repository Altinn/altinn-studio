import React from 'react';
import { Outlet } from 'react-router-dom';
import { StudioPageHeader } from '@studio/components/';

export const PageLayout = () => {
  return (
    <>
      <StudioPageHeader>
        <StudioPageHeader.Main>
          <StudioPageHeader.Left />
        </StudioPageHeader.Main>
      </StudioPageHeader>
      <Outlet />
    </>
  );
};
