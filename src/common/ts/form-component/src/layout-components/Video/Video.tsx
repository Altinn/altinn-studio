import { useCurrentLanguage, useTranslation } from '../../LanguageTranslatorProvider';
import { ComponentStructure } from '../common/ComponentStructure';
import classes from './Video.module.css';
import type { IGridStyling } from '../../app-components/Flex';

export interface VideoSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface VideoProps {
  componentId: string;
  src?: VideoSrc;
  altText?: string;
  mediaHeight?: number | string;
  innerGrid?: IGridStyling;
}

export function Video({ componentId, src, altText, mediaHeight, innerGrid }: VideoProps) {
  const { langAsString } = useTranslation();
  const currentLanguage = useCurrentLanguage();
  const videoSrc = src?.[currentLanguage] || '';
  const label = altText ? langAsString(altText) : undefined;

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <video
        controls
        id={componentId}
        style={{
          height: mediaHeight,
        }}
        className={classes.videoContainer}
      >
        <source src={videoSrc} />
        <track kind='captions' src={videoSrc} srcLang={currentLanguage} label={label} />
      </video>
    </ComponentStructure>
  );
}
