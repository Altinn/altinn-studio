import React from 'react';

export interface IAltinnIconComponentProvidedProps {
  iconClass: string;
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
  return (
    <i
      className={props.iconClass}
      style={Object.keys(style).length ? style : undefined}
    />
  );
}

export default AltinnIconComponent;
