import React from 'react';

import { InstantiationButton } from 'src/layout/InstantiationButton/InstantiationButton';
import type { PropsFromGenericComponent } from 'src/layout';
import type { IButtonProvidedProps } from 'src/layout/Button/ButtonComponent';

export type IInstantiationButtonComponentReceivedProps = PropsFromGenericComponent<'InstantiationButton'>;
export type IInstantiationButtonComponentProvidedProps = IButtonProvidedProps;

const btnGroupStyle = {
  marginTop: '2.25rem',
  marginBottom: '0',
};

const rowStyle = {
  marginLeft: '0',
};

export function InstantiationButtonComponent({
  text,
  node,
  ...componentProps
}: IInstantiationButtonComponentReceivedProps) {
  const props: IInstantiationButtonComponentProvidedProps = { ...componentProps, ...node.item, node, text };

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
