import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import classes from 'src/components/presentation/Header.module.css';
import { useAppName, useAppOwner, useHasAppTextsYet } from 'src/core/texts/appTexts';
import { useDisplayAppOwnerNameInHeader } from 'src/hooks/useAppLogo';

export interface IHeaderProps extends PropsWithChildren {
  header: string | React.ReactNode;
}

interface IInnerHeaderProps extends IHeaderProps {
  aboveHeader?: string | React.ReactNode;
}

const InnerHeader = ({ header, aboveHeader, children }: IInnerHeaderProps) => (
  <header className={classes.wrapper}>
    <Grid
      container
      direction='row'
      justifyContent='space-between'
      wrap='nowrap'
      spacing={4}
    >
      <Grid item>
        {aboveHeader && (
          <Grid item>
            <span>{aboveHeader}</span>
          </Grid>
        )}
        <Grid item>
          <Heading
            level={1}
            size='medium'
            data-testid='presentation-heading'
          >
            {header}
          </Heading>
        </Grid>
      </Grid>
      {children}
    </Grid>
  </header>
);

export function Header({ children, ...props }: IHeaderProps) {
  const isLoaded = useHasAppTextsYet();

  return isLoaded ? (
    <HeaderWithTexts {...props}>{children}</HeaderWithTexts>
  ) : (
    <InnerHeader {...props}>{children}</InnerHeader>
  );
}

function HeaderWithTexts({ header, children }: IHeaderProps) {
  const appOwner = useAppOwner();
  const appName = useAppName();
  const ownerInHeader = useDisplayAppOwnerNameInHeader();
  const aboveHeader = ownerInHeader ? appOwner : undefined;

  return (
    <InnerHeader
      header={header || appName}
      aboveHeader={aboveHeader}
    >
      {children}
    </InnerHeader>
  );
}
