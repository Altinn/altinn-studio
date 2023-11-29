import React from 'react';

import { Grid, makeStyles } from '@material-ui/core';

import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { useLanguage } from 'src/features/language/useLanguage';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { PropsFromGenericComponent } from 'src/layout';

export type IImageProps = PropsFromGenericComponent<'Image'>;

const useStyles = makeStyles({
  spacing: {
    letterSpacing: '0.3px',
  },
});

export function ImageComponent({ node }: IImageProps) {
  const { lang, langAsString } = useLanguage();
  const { id, image, textResourceBindings } = node.item;
  const classes = useStyles();
  const languageKey = useAppSelector((state) => state.profile.profile?.profileSettingPreference.language || 'nb');
  const width = image?.width || '100%';
  const align = image?.align || 'center';
  const altText = textResourceBindings?.altTextImg && langAsString(textResourceBindings.altTextImg);

  let imgSrc = image?.src[languageKey] || image?.src.nb || '';
  if (imgSrc.startsWith('wwwroot')) {
    imgSrc = imgSrc.replace('wwwroot', `/${window.org}/${window.app}`);
  }

  const imgType = imgSrc.slice(-3);
  const renderSvg = imgType.toLowerCase() === 'svg';

  return (
    <Grid
      container
      direction='row'
      justifyContent={align}
      spacing={1}
    >
      <Grid item={true}>
        {renderSvg ? (
          <object
            type='image/svg+xml'
            id={id}
            data={imgSrc}
            role={'presentation'}
          >
            <img
              src={imgSrc}
              alt={altText}
              style={{
                width,
              }}
            />
          </object>
        ) : (
          <img
            id={id}
            src={imgSrc}
            alt={altText}
            style={{
              width,
            }}
          />
        )}
      </Grid>
      {textResourceBindings?.help && (
        <Grid
          item={true}
          className={classes.spacing}
        >
          <HelpTextContainer
            helpText={lang(textResourceBindings.help)}
            title={altText}
          />
        </Grid>
      )}
    </Grid>
  );
}
