import * as React from 'react';
import { styled } from '@mui/material/styles';

type CenterContainerProps = {
  children: React.ReactNode;
};

const Root = styled('div')(() => ({
  width: '83.33%',
  marginLeft: 'auto',
  marginRight: 'auto',
}));

export const CenterContainer = ({ children }: CenterContainerProps) => {
  return <Root>{children}</Root>;
};
