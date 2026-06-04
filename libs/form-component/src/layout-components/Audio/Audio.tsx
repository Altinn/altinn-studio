// this eslint-disables will be fixed once this PR is merged:
// eslint-disable-next-line no-relative-import-paths/no-relative-import-paths
import { useTranslation } from '../../LanguageTranslatorProvider';
import classes from './Audio.module.css';

/**
 * Props that map 1:1 to the component's Studio-configurable options. These are the props an app
 * developer documents and experiments with in Storybook — see {@link AUDIO_CONFIG_KEYS}.
 */
export interface AudioConfig {
  /** The component id. */
  id: string;
  /**
   * The audio source URL. In Studio this is configured per language (`audio.src`); the runtime
   * wrapper resolves it to the URL for the active language before passing it in.
   */
  src?: string;
  /**
   * Text-resource key for the alternative text. It is resolved via the language context and used as
   * the captions track label (for screen readers).
   */
  altText?: string;
}

/**
 * Internal wiring supplied by the runtime wrapper: the active language and a display override. These
 * are intentionally NOT part of the Studio configuration and are hidden from the Storybook controls
 * (only {@link AUDIO_CONFIG_KEYS} are shown).
 */
export interface AudioControlProps {
  /** The active language code, used as the captions track `srcLang`. */
  srcLang?: string;
  /** CSS height applied when the audio is rendered inside a Card's media slot. */
  mediaHeight?: string;
}

export interface AudioProps extends AudioConfig, AudioControlProps {}

/**
 * The configurable props, derived from {@link AudioConfig}. The `satisfies Record<...>` keeps this
 * list exhaustive: adding a prop to `AudioConfig` without listing it here is a compile error.
 * Storybook uses it (`controls.include`) to show controls for exactly the configurable props and
 * nothing else.
 */
export const AUDIO_CONFIG_KEYS = Object.keys({
  id: true,
  src: true,
  altText: true,
} satisfies Record<keyof AudioConfig, true>) as (keyof AudioConfig)[];

export function Audio({ id, src = '', altText, srcLang, mediaHeight }: AudioProps) {
  const { translate } = useTranslation();

  const label = altText ? translate(altText) : undefined;

  return (
    <audio
      controls
      id={id}
      className={classes.audio}
      style={{ height: mediaHeight }}
    >
      <source src={src} />
      <track
        kind='captions'
        src={src}
        srcLang={srcLang}
        label={label}
      />
    </audio>
  );
}
