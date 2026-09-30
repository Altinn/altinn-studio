import { useCurrentLanguage, useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './Audio.module.css';

/** Audio source URLs keyed by language code (e.g. `nb`, `nn`, `en`). */
export interface AudioSrc {
  nb?: string;
  nn?: string;
  en?: string;
  [key: string]: string | undefined;
}

export interface AudioProps {
  /** The indexed component ID; drives the audio element's id and the form-content wrapper. */
  componentId: string;
  /** Audio source URLs keyed by language; the source for the current language is used. */
  src?: AudioSrc;
  /** Text resource key for the alternative text (captions/screen readers). */
  altText?: string;
  /** Fixed height (CSS length or px number), applied when the audio is rendered inside card media. */
  mediaHeight?: number | string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
}

export function Audio({ componentId, src, altText, mediaHeight, innerGrid }: AudioProps) {
  const { langAsString } = useTranslation();
  const currentLanguage = useCurrentLanguage();

  const audioSrc = src?.[currentLanguage] || '';
  const label = altText ? langAsString(altText) : undefined;

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <audio
        controls
        id={componentId}
        style={{
          height: mediaHeight,
        }}
        className={classes.audioContainer}
      >
        <source src={audioSrc} />
        <track kind='captions' src={audioSrc} srcLang={currentLanguage} label={label} />
      </audio>
    </ComponentStructure>
  );
}
