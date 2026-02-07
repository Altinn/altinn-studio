import React from 'react';
import type { PropsWithChildren } from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import classes from 'src/components/presentation/Header.module.css';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';

export interface IHeaderProps extends PropsWithChildren {
  header: string | React.ReactNode;
}

export function Header({ header: _header, children }: IHeaderProps) {
  const appOwner = useAppOwner();
  const appName = useAppName();
  const header = _header || appName;

  return (
    <header className={classes.wrapper}>
      <Flex
        container
        direction='row'
        justifyContent='space-between'
        spacing={4}
      >
        <Flex item>
          {appOwner && (
            <Flex item>
              <span>{appOwner}</span>
            </Flex>
          )}
          <Flex item>
            <Heading
              level={1}
              data-size='md'
              className={cn({ [classes.noAboveHeader]: !appOwner })}
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
}
