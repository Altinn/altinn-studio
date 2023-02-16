import React from 'react';

import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { PropsFromGenericComponent } from 'src/layout';

export type IInstantiationButtonComponentProps = PropsFromGenericComponent<'InstantiationButton'>;

const btnGroupStyle = {
  marginTop: '2.25rem',
  marginBottom: '0',
};

const rowStyle = {
  marginLeft: '0',
};

export function InstantiationButtonComponent({ text, ...props }: IInstantiationButtonComponentProps) {
  return (
    <div className='container pl-0'>
      <div
        className='a-btn-group'
        style={btnGroupStyle}
      >
        <div
          className='row'
          style={rowStyle}
        >
          <div className='pl-0 a-btn-sm-fullwidth'>
            <InstantiationButton {...props}>{text}</InstantiationButton>
          </div>
        </div>
      </div>
    </div>
  );
}
