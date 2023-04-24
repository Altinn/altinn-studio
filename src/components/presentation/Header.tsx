import React from 'react';

import { Grid } from '@material-ui/core';
import classNames from 'classnames';

import { Progress } from 'src/components/presentation/Progress';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { ProcessTaskType } from 'src/types';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { PresentationType } from 'src/types';

export interface IHeaderProps {
  type: ProcessTaskType | PresentationType;
  header?: string | JSX.Element | JSX.Element[];
  appOwner?: string;
}

export const Header = ({ type, header, appOwner }: IHeaderProps) => {
  const showProgressSettings = useAppSelector((state) => state.formLayout.uiConfig.showProgress);
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);

  const showProgress = type !== ProcessTaskType.Archived && showProgressSettings;

  if (!language) {
    return null;
  }

  return (
    <header
      className={classNames('modal-header', 'a-modal-header', {
        'a-modal-background-success': type === ProcessTaskType.Archived,
      })}
    >
      <div className='a-iconText a-iconText-background a-iconText-large'>
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
              <h1 className='a-iconText-text mb-0'>
                <span
                  className='a-iconText-text-large'
                  data-testid='presentation-heading'
                >
                  {type === ProcessTaskType.Archived ? (
                    <span>{getTextFromAppOrDefault('receipt.receipt', textResources, language)}</span>
                  ) : (
                    header
                  )}
                </span>
              </h1>
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
      </div>
    </header>
  );
};
