/* eslint-disable import/first */
import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import classNames = require('classnames');
import { useMediaQuery } from '@material-ui/core';
import { ProcessSteps } from '../../types';

const Header = (props: any) => {
  const mobileView = useMediaQuery('(max-width:767px)');

  return (
    <div
      className={classNames(
        'modal-header',
        'a-modal-header',
        { 'a-modal-background-success': props.step === ProcessSteps.Archived },
      )}
    >
      <div className='a-iconText a-iconText-background a-iconText-large'>
        <div className='a-iconText-icon'>
          <i
            className='fa fa-corp a-icon'
            aria-hidden='true'
            style={mobileView ? { fontSize: '2em' } : null}
          />
        </div>
        <h1 className='a-iconText-text mb-0'>
          <span className='a-iconText-text-large'>{props.step === ProcessSteps.Archived ? (
            <span>{getLanguageFromKey('receipt.receipt', props.language)}</span>
          ) : (props.header)}
          </span>
        </h1>
      </div>
    </div>
  );
};

export default Header;
