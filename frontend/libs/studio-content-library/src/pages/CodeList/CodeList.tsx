import React from 'react';
import { useRouterContext } from '../../contexts/RouterContext';

export type CodeListProps = {
  title: string;
};
export const CodeList = ({ title }: CodeListProps) => {
  const { navigate } = useRouterContext();

  const handleNavigation = () => {
    navigate('root');
  };

  return (
    <>
      <h1>{title} </h1>
      <button onClick={handleNavigation}>Lenke</button>
    </>
  );
};
