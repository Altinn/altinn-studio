import { Flex } from '@app/form-component/app-components';
import { useTranslation } from '@app/form-component/LanguageTranslatorProvider';
import { ComponentStructure } from '@app/form-component/layout-components/common/ComponentStructure';
import { HelpTextContainer } from '@app/form-component/layout-components/common/HelpTextContainer';
import type { IGridStyling } from '@app/form-component/app-components/Flex';

import classes from './ImageLayout.module.css';

/** Justification/alignment of the image within its row. Mirrors the Studio `image.align` option. */
export type ImageAlign =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

export interface ImageLayoutProps {
  /** The indexed component ID; drives the image DOM id and the form-content wrapper. */
  componentId: string;
  /** Fully resolved image source URL (language selection and path resolution happen in the wrapper). */
  src: string;
  /** CSS width of the image. Defaults to `100%`. */
  width?: string;
  /** Justification/alignment of the image within its row. Defaults to `center`. */
  align?: ImageAlign;
  /** Text resource key for the alt text (read by screen readers). */
  altText?: string;
  /** Text resource key for the help tooltip. */
  help?: string;
  /** Grid sizing for the inner content. */
  innerGrid?: IGridStyling;
  /** True when rendered as the media of a parent Card; renders the bare image without the label wrapper. */
  renderedInCardMedia?: boolean;
  /** Minimum media height applied when rendered in a Card's media slot. */
  cardMediaHeight?: string;
}

export function ImageLayout({
  componentId,
  src,
  width = '100%',
  align = 'center',
  altText,
  help,
  innerGrid,
  renderedInCardMedia,
  cardMediaHeight,
}: ImageLayoutProps) {
  const { lang, langAsString } = useTranslation();
  const resolvedAltText = altText ? langAsString(altText) : undefined;
  const basePath = src.split(/[?#]/)[0].toLowerCase();
  const renderSvg = basePath.endsWith('.svg') || src.startsWith('data:image/svg');

  if (renderedInCardMedia) {
    return (
      <InnerImage
        id={componentId}
        renderSvg={renderSvg}
        altText={resolvedAltText}
        src={src}
        width={width}
        height={cardMediaHeight}
      />
    );
  }

  return (
    <ComponentStructure componentId={componentId} innerGrid={innerGrid}>
      <Flex container direction='row' justifyContent={align} spacing={2}>
        <Flex item className={classes.imageItem}>
          <InnerImage
            id={componentId}
            renderSvg={renderSvg}
            altText={resolvedAltText}
            src={src}
            width={width}
          />
        </Flex>
        {help && (
          <Flex item className={classes.helpItem}>
            <HelpTextContainer id={componentId} title={altText} helpText={lang(help)} />
          </Flex>
        )}
      </Flex>
    </ComponentStructure>
  );
}

interface InnerImageProps {
  renderSvg: boolean;
  id: string;
  src: string;
  altText?: string;
  width: string;
  height?: string;
}

function InnerImage({ renderSvg, id, src, altText, width, height }: InnerImageProps) {
  if (renderSvg) {
    return (
      <object type='image/svg+xml' id={id} data={src} role='presentation'>
        <img src={src} alt={altText} style={{ width, height }} />
      </object>
    );
  }

  return <img id={id} src={src} alt={altText} style={{ width, height }} />;
}
