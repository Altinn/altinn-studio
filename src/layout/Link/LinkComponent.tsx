import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import type { PropsFromGenericComponent } from '..';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { ButtonColor, ButtonVariant } from 'src/layout/Button/WrappedButton';
import type { LinkStyle } from 'src/layout/Link/config.generated';

export const buttonStyles: {
  [style in Exclude<LinkStyle, 'link'>]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: 'primary', color: 'success' },
  secondary: { variant: 'secondary', color: 'first' },
};

export type ILinkComponent = PropsFromGenericComponent<'Link'>;

export function LinkComponent({ node }: ILinkComponent) {
  const { id, style: linkStyle, openInNewTab, textResourceBindings } = useNodeItem(node);
  const { langAsString } = useLanguage();
  const parentIsPage = node.parent instanceof LayoutPage;
  const style = { marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined };
  const downloadName = textResourceBindings?.download;

  const Link = () => (
    <div style={style}>
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
      id={`link-${id}`}
      style={style}
      color={buttonStyles[linkStyle].color}
      variant={buttonStyles[linkStyle].variant}
      size='small'
      onClick={LinkButtonOnClick()}
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
