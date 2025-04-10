import React, { type ReactElement } from 'react';
import { Trans } from 'react-i18next';
import { StudioList, StudioLink } from '@studio/components-legacy';

type ListItemWithLinkProps = {
  textKey: string;
  link: string;
};
export const ListItemWithLink = ({ textKey, link }: ListItemWithLinkProps): ReactElement => (
  <StudioList.Item>
    <Trans
      i18nKey={textKey}
      components={{
        a: (
          <StudioLink target='_blank' rel='noopener noreferrer' href={link}>
            {' '}
          </StudioLink>
        ),
      }}
    />
  </StudioList.Item>
);
