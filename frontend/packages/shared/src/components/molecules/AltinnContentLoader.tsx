import React from 'react';
import type { IContentLoaderProps } from 'react-content-loader';
import ContentLoader from 'react-content-loader';
import AltinnContentIconComponent from '../atoms/AltinnContentIcon';

export type IAltinnContentLoaderProps = {
  /** The height of the loader, defaults to 200 */
  height?: number;
  /** The width of the loader, defaults to 400 */
  width?: number;
} & IContentLoaderProps;

export const AltinnContentLoader = (props: React.PropsWithChildren<IAltinnContentLoaderProps>) => {
  return (
    <ContentLoader
      height={props.height ? props.height : 200}
      width={props.width ? props.width : 400}
      {...props}
    >
      {props.children ? props.children : <AltinnContentIconComponent />}
    </ContentLoader>
  );
};
