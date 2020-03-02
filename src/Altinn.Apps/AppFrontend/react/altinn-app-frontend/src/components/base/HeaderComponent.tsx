import * as React from 'react';

export interface IHeaderProps {
  id: string;
  text: string;
  size?: string;
}

export function HeaderComponent(props: IHeaderProps) {

  const h2style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  const h3style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  const h4style = {
    marginTop: '4.8rem',
    marginBottom: '0',
  };

  switch (props.size) {
    case ('S'): {
      return <h4 id={props.id} style={h4style}>{props.text}</h4>;
    }

    case ('M'): {
      return <h3 id={props.id} style={h3style}>{props.text}</h3>;
    }

    case ('L'): {
      return <h2 id={props.id} style={h2style}>{props.text}</h2>;
    }

    default: {
      break;
    }
  }

  return <h4 id={props.id} style={h4style}>{props.text}</h4>;
}
