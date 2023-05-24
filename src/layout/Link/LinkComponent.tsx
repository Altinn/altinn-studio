import React from 'react';

import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';

import type { PropsFromGenericComponent } from '..';

import { LayoutPage } from 'src/utils/layout/LayoutPage';
import type { LinkStyle } from 'src/layout/Link/types';

export const buttonStyles: {
  [style in Exclude<LinkStyle, 'link'>]: { color: ButtonColor; variant: ButtonVariant };
} = {
  primary: { variant: ButtonVariant.Filled, color: ButtonColor.Success },
  secondary: { variant: ButtonVariant.Outline, color: ButtonColor.Primary },
};

export type ILinkComponent = PropsFromGenericComponent<'Link'>;

export function LinkComponent({ node, getTextResourceAsString }: ILinkComponent) {
  const { id, style, openInNewTab, textResourceBindings } = node.item;
  const title = getTextResourceAsString(textResourceBindings?.title);
  const target = getTextResourceAsString(textResourceBindings?.target);
  const parentIsPage = node.parent instanceof LayoutPage;

  if (style === 'link') {
    return (
      <div style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}>
        <a
          id={`link-${id}`}
          href={target}
          target={openInNewTab ? '_blank' : undefined}
          rel={openInNewTab ? 'noreferrer' : undefined}
        >
          {title}
        </a>
      </div>
    );
  } else {
    const { color, variant } = buttonStyles[style];

    return (
      <Button
        id={`link-${id}`}
        style={{ marginTop: parentIsPage ? 'var(--button-margin-top)' : undefined }}
        color={color}
        variant={variant}
        onClick={() => window.open(target, openInNewTab ? '_blank' : '_self')}
      >
        {title}
      </Button>
    );
  }
}
