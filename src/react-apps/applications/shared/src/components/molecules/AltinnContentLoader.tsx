import * as React from 'react';
import ContentLoader from 'react-content-loader';
import AltinnContentIcon from '../atoms/AltinnContentIcon';

export interface IAltinnContentLoaderProps {
/** The height of the loader, defaults to 200 */
  height?: number;
}

export default function(props: IAltinnContentLoaderProps) {

  return (
    <ContentLoader
          height={props.height ? props.height : 200}
    >
      <AltinnContentIcon/>
    </ContentLoader>
  );
}
