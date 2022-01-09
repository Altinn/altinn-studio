/* eslint-disable import/first */
import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';
import classNames from 'classnames';
import { PresentationType, ProcessTaskType } from '../../types';
import { ILanguage } from 'altinn-shared/types';

export interface IHeaderProps {
  type: ProcessTaskType | PresentationType;
  language: ILanguage;
  header?: string;
}

const mobileStyle = {
  fontSize: '2em',
};

const Header = (props: IHeaderProps) => {
  return (
    <div
      className={classNames('modal-header', 'a-modal-header', {
        'a-modal-background-success': props.type === ProcessTaskType.Archived,
      })}
    >
      <div className='a-iconText a-iconText-background a-iconText-large'>
<<<<<<< HEAD
=======
        <div className='a-iconText-icon'>
          <i
            className='fa fa-corp a-icon'
            aria-hidden='true'
            style={mobileView ? mobileStyle : null}
          />
        </div>
>>>>>>> 4b8e5851696d2bea855fb6194f472e1672f1bd43
        <h1 className='a-iconText-text mb-0'>
          <span className='a-iconText-text-large'>
            {props.type === ProcessTaskType.Archived ? (
              <span>
                {getLanguageFromKey('receipt.receipt', props.language)}
              </span>
            ) : (
              props.header
            )}
          </span>
        </h1>
      </div>
    </div>
  );
};

export default Header;
