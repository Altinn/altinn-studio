import * as React from 'react';
import { IInstantiationButtonProps } from 'src/features/form/layout';

const buttonStyle = {
  marginBottom: '0',
  width: '100%',
};

const btnGroupStyle = {
  marginTop: '3.6rem',
  marginBottom: '0',
};

const rowStyle = {
  marginLeft: '0',
};

export function InstantitiationButton(props: IInstantiationButtonProps) {

  const instantiate = () => {
    // TODO: call action to map and instantiate
  };

  return (
    <div className='container pl-0'>
      <div className='a-btn-group' style={btnGroupStyle}>
        <div className='row' style={rowStyle}>
        <button
            type='submit'
            className='a-btn a-btn-success'
            id={props.id}
            style={buttonStyle}
            onClick={instantiate}
          >
            {props.text}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InstantitiationButton;
