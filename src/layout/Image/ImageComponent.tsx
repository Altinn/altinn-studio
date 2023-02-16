import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks/useAppSelector';
import { HelpTextContainer } from 'src/features/form/components/HelpTextContainer';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IAltinnWindow } from 'src/types';

export type IImageProps = PropsFromGenericComponent<'Image'>;

const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
  },
});

export function ImageComponent(props: IImageProps) {
  const classes = useStyles();
  const language = useAppSelector((state) => state.profile.profile?.profileSettingPreference.language || 'nb');
  const width = props.image?.width || '100%';
  const align = props.image?.align || 'center';
  const altText =
    props.textResourceBindings?.altTextImg && props.getTextResourceAsString(props.textResourceBindings.altTextImg);

  let imgSrc = props.image?.src[language] || props.image?.src.nb || '';
  if (imgSrc.startsWith('wwwroot')) {
    imgSrc = imgSrc.replace(
      'wwwroot',
      `/${(window as Window as IAltinnWindow).org}/${(window as Window as IAltinnWindow).app}`,
    );
  }

  const imgType = imgSrc.slice(-3);
  const renderSvg = imgType.toLowerCase() === 'svg';

  return (
    <Grid
      container
      direction='row'
      justifyContent={align}
    >
      <Grid item={true}>
        {renderSvg ? (
          <object
            type='image/svg+xml'
            id={props.id}
            data={imgSrc}
            role={'presentation'}
          >
            <img
              src={imgSrc}
              alt={altText}
              style={{
                width: width,
              }}
            />
          </object>
        ) : (
          <img
            id={props.id}
            src={imgSrc}
            alt={altText}
            style={{
              width: width,
            }}
          />
        )}
      </Grid>
      {props.textResourceBindings?.help && (
        <Grid
          item={true}
          className={classes.spacing}
        >
          <HelpTextContainer
            language={props.language}
            helpText={props.getTextResource(props.textResourceBindings.help)}
          />
        </Grid>
      )}
    </Grid>
  );
}
