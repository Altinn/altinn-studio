import * as React from 'react';

type CenterContainerProps = {
  children: React.ReactNode;
};

export const CenterContainer = ({ children }: CenterContainerProps) => {
  return (
    <div
      style={{
        width: '83.33%',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      {children}
    </div>
  );
};
