import React from 'react';

import { Heading } from '@digdir/design-system-react';
import { Grid } from '@material-ui/core';

import classes from 'src/components/presentation/Header.module.css';
import { Progress } from 'src/components/presentation/Progress';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useLanguage } from 'src/hooks/useLanguage';
import { ProcessTaskType } from 'src/types';
import type { PresentationType } from 'src/types';

export interface IHeaderProps {
  type: ProcessTaskType | PresentationType;
  header?: string | JSX.Element | JSX.Element[];
  appOwner?: string;
}

export const Header = ({ type, header, appOwner }: IHeaderProps) => {
  const showProgressSettings = useAppSelector((state) => state.formLayout.uiConfig.showProgress);
  const showProgress = type !== ProcessTaskType.Archived && showProgressSettings;
  const { lang } = useLanguage();

  return (
    <header className={classes.wrapper}>
      <Grid
        container
        direction='row'
        justifyContent='space-between'
        wrap='nowrap'
        spacing={2}
      >
        <Grid item>
          <Grid item>
            <span>{appOwner}</span>
          </Grid>
          <Grid item>
            <Heading
              level={1}
              size='medium'
              data-testid='presentation-heading'
            >
              {type === ProcessTaskType.Archived ? <span>{lang('receipt.receipt')}</span> : header}
            </Heading>
          </Grid>
        </Grid>
        {showProgress && (
          <Grid
            item
            aria-live='polite'
          >
            <Progress />
          </Grid>
        )}
      </Grid>
    </header>
  );
};
