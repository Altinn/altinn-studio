import type { CSSProperties, ReactNode } from 'react';

import { Button } from '@app/form-component/app-components/Button';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import type {
  ButtonColor,
  ButtonVariant,
  TextAlign,
} from '@app/form-component/app-components/Button';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

export type LinkStyle = 'primary' | 'secondary' | 'link';
export type LinkPosition = 'left' | 'center' | 'right';
export type LinkSize = 'sm' | 'md' | 'lg';

/** Maps a non-`link` style onto the button primitive's variant/color pair. */
const buttonStyles: {
  [style in Exclude<LinkStyle, 'link'>]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

/** Turns a horizontal position into the margin style used to align a button in its container. */
function alignStyle(position: LinkPosition): CSSProperties {
  switch (position) {
    case 'right':
      return { marginLeft: 'auto' };
    case 'center':
      return { margin: '0 auto' };
    default:
      return {};
  }
}

export interface LinkProps {
  /** The indexed component ID; drives the element id and the form-content wrapper. */
  componentId: string;
  /** Whether to render an actual link (`link`) or a primary/secondary button. */
  style: LinkStyle;
  /** Text resource key for the link/button text. */
  title?: string;
  /** Text resource key resolving to the link target (URL). */
  target?: string;
  /**
   * Text resource key for the download filename. When omitted the target is navigated to; a blank
   * value downloads with the default filename; a non-blank value is used as the filename.
   */
  download?: string;
  /** Open the link in a new tab. */
  openInNewTab?: boolean;
  /** Button size (button styles only). */
  size?: LinkSize;
  /** Stretch the button to the full available width (button styles only). */
  fullWidth?: boolean;
  /** Horizontal text alignment inside the button (button styles only). */
  textAlign?: TextAlign;
  /** Horizontal position of the button within its container (button styles only). */
  position?: LinkPosition;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** Grid sizing for the validation messages. */
  validationGrid?: IGridStyling;
  /** Rendered validation messages. */
  validationMessages?: ReactNode;
}

export function Link({
  componentId,
  style,
  title,
  target,
  download,
  openInNewTab,
  size,
  fullWidth,
  textAlign,
  position,
  innerGrid,
  validationGrid,
  validationMessages,
}: LinkProps) {
  const { lang, langAsString } = useTranslation();

  const href = langAsString(target);
  const downloadAttr =
    download !== undefined ? (download === '' ? true : langAsString(download)) : undefined;

  const content =
    style === 'link' ? (
      <div>
        <a
          id={`link-${componentId}`}
          download={downloadAttr}
          href={href}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noreferrer' : undefined}
        >
          {lang(title)}
        </a>
      </div>
    ) : (
      <Button
        style={position ? alignStyle(position) : {}}
        textAlign={textAlign}
        id={`link-${componentId}`}
        color={buttonStyles[style].color}
        variant={buttonStyles[style].variant}
        onClick={() => {
          const anchor = document.createElement('a');
          anchor.href = href;
          anchor.target = openInNewTab ? '_blank' : '_self';
          if (download !== undefined) {
            anchor.download = download === '' ? '' : langAsString(download);
          }
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
        }}
        size={size}
        fullWidth={fullWidth}
      >
        {lang(title)}
      </Button>
    );

  return (
    <ComponentStructure
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={validationMessages}
    >
      {content}
    </ComponentStructure>
  );
}
