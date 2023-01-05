import React from 'react';
import { useParams } from 'react-router-dom';
import classes from './IFrameComponent.module.css';

interface IIFrameComponentProvidedProps {
  iframeEndingUrl: string;
}

export function IFrameComponent({ iframeEndingUrl }: IIFrameComponentProvidedProps) {
  const { org, app } = useParams();

  const url = `${window.location.origin}/designer/${org}/${app}/${iframeEndingUrl}`;
  return (
    <div className={classes.mainLayout}>
      {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
      <iframe className={classes.iFrameLayout} src={url} />
    </div>
  );
}

export const IFrame = IFrameComponent;
