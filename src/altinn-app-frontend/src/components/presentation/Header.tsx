import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import classNames from 'classnames';
import type { PresentationType } from 'src/types';
import { ProcessTaskType } from 'src/types';
import { Grid } from '@material-ui/core';
import { Progress } from 'src/components/presentation/Progress';
import { useAppSelector } from 'src/common/hooks';

export interface IHeaderProps {
  type: ProcessTaskType | PresentationType;
  header?: string;
  appOwner?: string;
}

const Header = ({ type, header, appOwner }: IHeaderProps) => {
  const showProgress = useAppSelector(
    (state) => state.formLayout.uiConfig.showProgress,
  );
  const language = useAppSelector((state) => state.language.language);
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
                    <span>
                      {getLanguageFromKey('receipt.receipt', language)}
                    </span>
                  ) : (
                    header
                  )}
                </span>
              </h1>
            </Grid>
          </Grid>
          {showProgress && (
            <Grid item>
              <Progress />
            </Grid>
          )}
        </Grid>
      </div>
    </header>
  );
};

export default Header;
