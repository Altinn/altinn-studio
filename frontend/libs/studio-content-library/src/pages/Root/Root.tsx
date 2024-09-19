import React, { ReactNode } from 'react';
import { useRouterContext } from '../../contexts/RouterContext';

export type RootPageProps = {
  title: string;
  children: ReactNode;
};

export const Root = ({ children, title }: RootPageProps) => {
  const { navigate } = useRouterContext();
  const handleNavigation = () => {
    navigate('codeList');
  };
  return (
    <>
      <h1>{title}</h1>
      {children}
      <button onClick={handleNavigation}>To codelist</button>
    </>
  );
};
