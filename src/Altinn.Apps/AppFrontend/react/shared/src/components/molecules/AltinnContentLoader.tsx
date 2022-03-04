import * as React from 'react';
import ContentLoader from 'react-content-loader';
import { AltinnContentIcon } from '../atoms/AltinnContentIcon';

export interface IAltinnContentLoaderProps {
  height?: number | string;
  width?: number | string;
  children?: React.ReactNode;
}

export const AltinnContentLoader = ({
  width = 400,
  height = 200,
  children,
}: IAltinnContentLoaderProps) => {

  return (
    <ContentLoader height={height} width={width}>
      {children ? children : <AltinnContentIcon />}
    </ContentLoader>
  );
};

export default AltinnContentLoader;
