import React from 'react';

import { Flex } from 'src/app-components/Flex/Flex';
import { HelpTextContainer } from 'src/components/form/HelpTextContainer';
import { Lang } from 'src/features/language/Lang';
import { useCurrentLanguage } from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useParentCard } from 'src/layout/Cards/CardContext';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type IImageProps = PropsFromGenericComponent<'Image'>;

export function ImageComponent({ node }: IImageProps) {
  const { langAsString } = useLanguage();
  const { id, image, textResourceBindings } = useItemWhenType(node.baseId, 'Image');
  const languageKey = useCurrentLanguage();
  const width = image?.width ?? '100%';
  const align = image?.align ?? 'center';
  const altText = textResourceBindings?.altTextImg ? langAsString(textResourceBindings.altTextImg) : undefined;

  let imgSrc = image?.src[languageKey] ?? image?.src.nb ?? '';
  if (imgSrc.startsWith('wwwroot')) {
    imgSrc = imgSrc.replace('wwwroot', `/${window.org}/${window.app}`);
  }

  const imgType = imgSrc.slice(-3);
  const renderSvg = imgType.toLowerCase() === 'svg';

  const renderedInCardMedia = useParentCard()?.renderedInMedia;
  const cardMediaHeight = useParentCard()?.minMediaHeight;
  if (renderedInCardMedia) {
    return (
      <InnerImage
        id={id}
        renderSvg={renderSvg}
        altText={altText}
        imgSrc={imgSrc}
        width={width}
        height={cardMediaHeight}
      />
    );
  }

  return (
    <ComponentStructureWrapper node={node}>
      <Flex
        container
        direction='row'
        justifyContent={align}
        spacing={2}
      >
        <Flex
          item
          style={{ flexBasis: 'auto' }}
        >
          <InnerImage
            id={id}
            renderSvg={renderSvg}
            altText={altText}
            imgSrc={imgSrc}
            width={width}
          />
        </Flex>
        {textResourceBindings?.help && (
          <Flex
            item
            style={{ letterSpacing: '0.3px', flexBasis: 'auto' }}
          >
            <HelpTextContainer
              helpText={<Lang id={textResourceBindings.help} />}
              title={altText}
            />
          </Flex>
        )}
      </Flex>
    </ComponentStructureWrapper>
  );
}

interface InnerImageProps {
  renderSvg: boolean;
  id: string;
  imgSrc: string;
  altText: string | undefined;
  width: string;
  height?: string;
}

function InnerImage({ renderSvg, id, imgSrc, altText, width, height }: InnerImageProps) {
  if (renderSvg) {
    return (
      <object
        type='image/svg+xml'
        id={id}
        data={imgSrc}
        role='presentation'
      >
        <img
          src={imgSrc}
          alt={altText}
          style={{
            width,
            height,
          }}
        />
      </object>
    );
  }

  return (
    <img
      id={id}
      src={imgSrc}
      alt={altText}
      style={{
        width,
        height,
      }}
    />
  );
}
