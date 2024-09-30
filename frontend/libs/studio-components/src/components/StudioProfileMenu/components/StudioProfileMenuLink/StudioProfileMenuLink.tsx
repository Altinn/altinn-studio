import { DropdownMenu } from '@digdir/designsystemet-react';
import React, { type ReactElement } from 'react';

export type StudioProfileMenuLinkProps = {
  itemName: string;
  href: string;
  openInNewTab?: boolean;
};

export const StudioProfileMenuLink = ({
  itemName,
  href,
  openInNewTab,
}: StudioProfileMenuLinkProps): ReactElement => {
  return (
    <DropdownMenu.Item key={itemName} asChild>
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
      >
        {itemName}
      </a>
    </DropdownMenu.Item>
  );
};
