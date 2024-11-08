import React, { type ReactElement } from 'react';
import type { IContentLoaderProps } from 'react-content-loader';
import ContentLoader from 'react-content-loader';

export const AltinnContentLoader = ({
  height,
  width,
  children,
  ...rest
}: IContentLoaderProps): ReactElement => {
  return (
    <ContentLoader height={height ? height : 200} width={width ? width : 400} {...rest}>
      {children}
    </ContentLoader>
  );
};
