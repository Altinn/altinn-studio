import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { Button, type ButtonColor, type ButtonVariant } from 'src/app-components/Button/Button';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { alignStyle } from 'src/layout/RepeatingGroup/Container/RepeatingGroupContainer';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { LinkStyle } from 'src/layout/Link/config.generated';

export const buttonStyles: {
  [style in Exclude<LinkStyle, 'link'>]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type ILinkComponent = PropsFromGenericComponent<'Link'>;

export function LinkComponent({ node }: ILinkComponent) {
  const {
    id,
    style: linkStyle,
    position,
    openInNewTab,
    textResourceBindings,
    size,
    fullWidth,
    textAlign,
  } = useItemWhenType(node.baseId, 'Link');
  const { langAsString } = useLanguage();

  const downloadName = textResourceBindings?.download;

  const Link = () => (
    <div>
      <a
        id={`link-${id}`}
        download={downloadName !== undefined ? (downloadName === '' ? true : langAsString(downloadName)) : undefined}
        href={langAsString(textResourceBindings?.target)}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noreferrer' : undefined}
      >
        <Lang id={textResourceBindings?.title} />
      </a>
    </div>
  );

  const LinkButton = () => (
    <Button
      style={position ? { ...alignStyle(position) } : {}}
      textAlign={textAlign}
      id={`link-${id}`}
      color={buttonStyles[linkStyle].color}
      variant={buttonStyles[linkStyle].variant}
      onClick={LinkButtonOnClick()}
      size={size}
      fullWidth={fullWidth}
    >
      <Lang id={textResourceBindings?.title} />
    </Button>
  );

  function LinkButtonOnClick() {
    return () => {
      const anchor = document.createElement('a');
      anchor.href = langAsString(textResourceBindings?.target);
      anchor.target = openInNewTab ? '_blank' : '_self';
      if (textResourceBindings?.download !== undefined) {
        anchor.download = textResourceBindings?.download === '' ? '' : langAsString(textResourceBindings?.download);
      }
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    };
  }

  return (
    <ComponentStructureWrapper node={node}>
      {linkStyle === 'link' ? <Link /> : <LinkButton />}
    </ComponentStructureWrapper>
  );
}
