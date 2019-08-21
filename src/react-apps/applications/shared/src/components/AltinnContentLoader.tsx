import * as React from 'react';
import ContentLoader from 'react-content-loader';
import AltinnContentIcon from './AltinnContentIcon';

export interface IAltinnContentLoaderProps {
  numberOfRows: number;
  height: number;
}

export default function(props: IAltinnContentLoaderProps) {

  const createLoaderIcon = (): JSX.Element[] => {
    const icons = [];
    for (let i = 0; i < props.numberOfRows; i++) {
      icons.push(<AltinnContentIcon/>);
    }
    return icons;
  };

  return (
    <ContentLoader
          height={props.height}
    >
      {createLoaderIcon().map((icon) => icon)}
    </ContentLoader>
  );
}
