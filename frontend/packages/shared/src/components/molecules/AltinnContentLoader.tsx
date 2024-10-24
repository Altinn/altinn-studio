import React, { type ReactNode } from 'react';
import type { IContentLoaderProps } from 'react-content-loader';
import ContentLoader from 'react-content-loader';

export type IAltinnContentLoaderProps = {
  /** The height of the loader, defaults to 200 */
  height?: number;
  /** The width of the loader, defaults to 400 */
  width?: number;
  children: ReactNode;
} & IContentLoaderProps;

export const AltinnContentLoader = ({
  height,
  width,
  children,
  ...rest
}: IAltinnContentLoaderProps) => {
  return (
    <ContentLoader height={height ? height : 200} width={width ? width : 400} {...rest}>
      {children}
    </ContentLoader>
  );
};
