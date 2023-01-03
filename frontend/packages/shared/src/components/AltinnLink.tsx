import React from 'react';
import AltinnIcon from './AltinnIcon';
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
      {props.shouldShowIcon && (
        <AltinnIcon
          isActive={false}
          iconClass='ai ai-arrowrightup'
          iconColor={'#000'}
          iconSize={20}
          margin='5px'
        />
      )}
    </a>
  );
};

export default AltinnLink;
