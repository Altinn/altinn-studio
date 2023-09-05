import React from 'react';

export interface IAltinnIconComponentProvidedProps {
  iconClass?: React.ComponentType | string;
  isActive?: boolean;
  isActiveIconColor?: string;
  iconColor: any;
  iconSize?: number | string;
  padding?: string;
  margin?: string;
  weight?: number;
}

export function AltinnIconComponent(props: IAltinnIconComponentProvidedProps) {
  const color = props.isActive ? props.isActiveIconColor : props.iconColor;
  const style = {
    ...(color && { color }),
    ...(props.iconSize && { fontSize: props.iconSize }),
    ...(props.iconSize && { fontSize: props.iconSize }),
    ...(props.weight && { fontWeight: props.weight }),
    ...(props.margin && { margin: props.margin }),
    ...(props.padding && { padding: props.padding }),
  };
  return (<span style={Object.keys(style).length ? style : undefined} >
            { <props.iconClass/> } 
          </span>);
}

export default AltinnIconComponent;
