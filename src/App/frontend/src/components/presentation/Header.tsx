import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/components/presentation/Header.module.css';
import { useAppName, useAppOwner, useHasAppTextsYet } from 'src/core/texts/appTexts';

export interface IHeaderProps extends PropsWithChildren {
  header: string | React.ReactNode;
}

interface IInnerHeaderProps extends IHeaderProps {
  aboveHeader?: string | React.ReactNode;
}

const InnerHeader = ({ header, aboveHeader, children }: IInnerHeaderProps) => (
  <header className={classes.wrapper}>
    <Flex
      container
      direction='row'
      justifyContent='space-between'
      spacing={4}
    >
      <Flex item>
        {aboveHeader && (
          <Flex item>
            <span>{aboveHeader}</span>
          </Flex>
        )}
        <Flex item>
          <Heading
            level={1}
            data-size='md'
            className={cn({ [classes.noAboveHeader]: !aboveHeader })}
            data-testid='presentation-heading'
          >
            {header}
          </Heading>
        </Flex>
      </Flex>
      {children}
    </Flex>
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

  return (
    <InnerHeader
      header={header || appName}
      aboveHeader={appOwner}
    >
      {children}
    </InnerHeader>
  );
}
