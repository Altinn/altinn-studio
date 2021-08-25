import * as React from 'react';
import { useSelector } from 'react-redux';
import { Grid, makeStyles } from '@material-ui/core';
import { ITextResourceBindings } from 'src/features/form/layout';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import { IRuntimeState } from '../../types';

export interface IImageProps {
  id: string;
  imageSpecs: IImagesSpecifics;
  textResourceBindings: ITextResourceBindings;
  commonPhrases: any;
  getTextResource: (key: string) => string;
  getTextResourceAsString: (key: string) => string;
}

export interface IImagesSpecifics {
  imageSrc: IImageSrc;
  imgWidth: string;
  align: string;
}

export interface IImageSrc {
  nb: string;
  nn: string;
  en: string;
}

const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
  },
});

export function ImageComponent(props: IImageProps) {
  const classes = useStyles();
  const language: string =
    useSelector((state: IRuntimeState) => state.profile.profile.profileSettingPreference.language);
  const width = props.imageSpecs.imgWidth || '100%';
  const altText = props.getTextResourceAsString(props.textResourceBindings.altTextImg) || 'image';

  let imgSrc;
  if (language === 'en' && props.imageSpecs.imageSrc.en) {
    imgSrc = props.imageSpecs.imageSrc.en;
  } else if (language === 'nn' && props.imageSpecs.imageSrc.nn) {
    imgSrc = props.imageSpecs.imageSrc.nn;
  } else {
    imgSrc = props.imageSpecs.imageSrc.nb;
  }

  let align;
  if (props.imageSpecs.align === 'right') {
    align = 'flex-end';
  } else if (props.imageSpecs.align === 'left') {
    align = 'flex-start';
  } else {
    align = 'center';
  }

  let showImg;
  const imgType = imgSrc.slice(-3);
  if (imgType.toLowerCase() === 'svg') {
    showImg =
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
      </object>;
  } else {
    showImg =
      <img
        id={props.id}
        src={imgSrc}
        alt={altText}
        width={width}
      />;
  }
  return (
    <Grid
      container
      direction='row'
      justify={align}
    >
      <Grid item={true}>
        {showImg}
      </Grid>
      {props.textResourceBindings?.help &&
      <Grid item={true} className={classes.spacing}>
        <HelpTextContainer
          language={props.commonPhrases}
          id={props.id}
          helpText={props.getTextResource(props.textResourceBindings.help)}
        />
      </Grid>
      }
    </Grid>
  );
}
