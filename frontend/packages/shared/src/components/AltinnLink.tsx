import React from 'react';
import classes from './AltinnLink.module.css';

export interface IAltinnLinkComponentProvidedProps {
  url: string;
  linkTxt: string;
  openInNewTab?: boolean;
  shouldShowIcon: boolean;
}

const AltinnLink = (props: IAltinnLinkComponentProvidedProps) => {
  const { openInNewTab } = props;
  return (
    <a
      href={props.url}
      className={classes.link}
      target={openInNewTab ? '_blank' : ''}
      rel='noreferrer'
    >
      {props.linkTxt}
    </a>
  );
};

export default AltinnLink;
