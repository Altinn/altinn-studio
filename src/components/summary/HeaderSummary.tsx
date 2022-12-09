import * as React from 'react';

import { Grid } from '@material-ui/core';

import { HeaderSize } from 'src/components/base/HeaderComponent';
import type { ILayoutCompHeader } from 'src/features/form/layout';

export interface IHeaderSummary {
  id: string;
  label: JSX.Element | JSX.Element[] | null | undefined;
  component: ILayoutCompHeader;
}

function HeaderSummary({ id, label, component }: IHeaderSummary) {
  return (
    <Grid
      item
      xs={12}
      data-testid={'header-summary'}
    >
      <HeaderSize
        id={id}
        size={component.size}
        text={label}
      />
    </Grid>
  );
}

export default HeaderSummary;
