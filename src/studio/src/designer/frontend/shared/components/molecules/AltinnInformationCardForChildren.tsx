import React from 'react';
import classNames from 'classnames';
import classes from './AltinnInformationCardForChildren.module.css';

export interface IAltinnInformationCardComponentProvidedProps {
  headerText: string;
  imageSource: string;
  shadow: boolean;
}

export const AltinnInformationCardForChildren = (
  props: React.PropsWithChildren<IAltinnInformationCardComponentProvidedProps>,
) => {
  return (
    <div className={classes.container}>
      <div className={classNames(classes.scrollable)}>
        <div
          className={classNames(classes.paper, {
            [classes.shadowBox]: props.shadow,
          })}
        >
          <div className={classes.textContainer}>
            <h1 className={classes.header}>{props.headerText}</h1>
            <p className={classes.breadText}>{props.children}</p>
          </div>
          <div className={classes.imageContainer}>
            <img alt='information' src={props.imageSource} />
          </div>
        </div>
      </div>
    </div>
  );
};
