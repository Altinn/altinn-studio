import React from 'react';

type RootPageProps = {
  children: React.ReactNode;
};

export const RootPage = ({ children }: RootPageProps): React.ReactElement => {
  return (
    <>
      <h2>This Page is not implemented yet</h2>
      {children}
    </>
  );
};
