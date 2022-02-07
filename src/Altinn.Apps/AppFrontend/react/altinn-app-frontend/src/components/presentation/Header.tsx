import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import classNames from 'classnames';
import { PresentationType, ProcessTaskType } from '../../types';
import { Grid } from '@material-ui/core';
import { ILanguage } from 'altinn-shared/types';

export interface IHeaderProps {
  type: ProcessTaskType | PresentationType;
  language: ILanguage;
  header?: string;
  appOwner?: string;
}

const Header = ({
  type,
  header,
  language,
  appOwner
}: IHeaderProps) => {
  return (
    <div
      className={classNames('modal-header', 'a-modal-header', {
        'a-modal-background-success': type === ProcessTaskType.Archived,
      })}
    >
      <div className='a-iconText a-iconText-background a-iconText-large'>
        <Grid container direction='column'>
          <Grid item>
            <span>
              {appOwner}
            </span>
          </Grid>
          <Grid item>
            <h1 className='a-iconText-text mb-0'>
              <span className='a-iconText-text-large' data-testid='presentation-heading'>
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
      </div>
    </div>
  );
};

export default Header;
