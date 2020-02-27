import * as React from 'react';

export interface IParagraphProps {
  id: string;
  text: string;
}


export function ParagraphComponent(props: IParagraphProps) {

  const style = {
    marginTop: '2.4rem',
  };

  return (
    <span id={props.id} style={style}>{props.text}</span>
  );
}
