import * as React from 'react';
import { Grid, GridJustification, makeStyles } from '@material-ui/core';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { IAltinnWindow } from '../../types';
import { useAppSelector } from 'src/common/hooks';
import { IComponentProps } from '..';

export interface IImageProps extends IComponentProps {
  image: IImage;
}

export interface IImage {
  src: IImagesrc;
  width: string;
  align: GridJustification;
}

export interface IImagesrc {
  nb: string;
  nn?: string;
  en?: string;
  [language: string]:string;
}

const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
  },
});

export function ImageComponent(props: IImageProps) {
  const classes = useStyles();
  const language = useAppSelector(state => state.profile.profile.profileSettingPreference.language);
  const width = props.image.width || '100%';
  const align = props.image.align || 'center';
  const altText = props.getTextResourceAsString(props.textResourceBindings.altTextImg);

  let imgSrc = props.image.src[language] || props.image.src.nb;
  if (imgSrc.startsWith('wwwroot')) {
    imgSrc = imgSrc.replace('wwwroot', `/${(window as Window as IAltinnWindow).org}/${(window as Window as IAltinnWindow).app}`);
  }

  const imgType = imgSrc.slice(-3);
  const renderSvg = imgType.toLowerCase() === 'svg';

  return (
    <Grid
      container
      direction='row'
      justify={align}
    >
      <Grid item={true}>
        {renderSvg ?
          (
            <object
              type='image/svg+xml'
              id={props.id}
              data={imgSrc}
              width={width}
            >
              <img
                src={imgSrc}
                alt={altText}
              />
            </object>
          )
          : (
            <img
              id={props.id}
              src={imgSrc}
              alt={altText}
              width={width}
            />
          )
        }
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} className={classes.spacing}>
        <HelpTextContainer
          language={props.language}
          id={props.id}
          helpText={props.getTextResource(props.textResourceBindings.help)}
        />
      </Grid>
      }
    </Grid>
  );
}
