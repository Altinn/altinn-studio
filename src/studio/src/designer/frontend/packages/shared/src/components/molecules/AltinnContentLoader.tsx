import React from 'react';
import ContentLoader from 'react-content-loader';
import AltinnContentIconComponent from '../atoms/AltinnContentIcon';

export interface IAltinnContentLoaderProps {
  /** The height of the loader, defaults to 200 */
  height?: number;
  /** The width of the loader, defaults to 400 */
  width?: number;
}

const AltinnLoaderContent = (props: React.PropsWithChildren<IAltinnContentLoaderProps>) => {
  return (
    <ContentLoader
      height={props.height ? props.height : 200}
      width={props.width ? props.width : 400}
    >
      {props.children ? props.children : <AltinnContentIconComponent />}
    </ContentLoader>
  );
};

export default AltinnLoaderContent;
