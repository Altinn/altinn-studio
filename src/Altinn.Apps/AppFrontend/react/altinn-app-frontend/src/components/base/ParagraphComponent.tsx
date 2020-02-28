import * as React from 'react';
import { Typography } from '@material-ui/core';

export interface IParagraphProps {
  id: string;
  text: string;
}


export function ParagraphComponent(props: IParagraphProps) {

  const style = {
    marginTop: '2.4rem',
  };

  return (
    <Typography id={props.id} style={style} tabIndex={0}>
      {props.text}
    </Typography>
  );
}
