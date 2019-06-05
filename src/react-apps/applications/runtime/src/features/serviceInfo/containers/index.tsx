import * as React from 'react';
import { RouteProps } from 'react-router-dom';

export default function (props: any) {
  const { history } = props;

  const onClickInstantiate = () => {
    history.push('/new');
  };

  return (
    <div style={{ backgroundColor: '#1EAEF7', height: 'calc(100vh - 146px)' }}>
      <div className='container'>
        <div className='row'>
          <div className='col-xl-12'>
            <div className='a-modal-top'>
              <img
                src='/designer/img/a-logo-blue.svg'
                alt='Altinn logo'
                className='a-logo a-modal-top-logo '
              />
              <div className='a-modal-top-user'>
                <div
                  className='a-personSwitcher '
                  title={'form_filler.placeholder_user'}
                >
                  <span className='a-personSwitcher-name'>
                    <span className='d-block' style={{ color: '#022F51' }}>
                      {'form_filler.placeholder_user'}
                    </span>
                    <span className='d-block' />
                  </span>
                  <i
                    className='fa fa-private-circle-big  a-personSwitcher-icon'
                    aria-hidden='true'
                    style={{ color: '#022F51' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div >
        <div className='row'>
          <div className='col-xl-10 offset-xl-1 a-p-static'>
            <div className='a-modal-navbar'>
              <button type='button' className='a-modal-back a-js-tabable-popover' aria-label='Tilbake'>
                <span className='ai-stack'>
                  <i className='ai ai-stack-1x ai-plain-circle-big' aria-hidden='true' />
                  <i className='ai-stack-1x ai ai-back' aria-hidden='true' />
                </span>
              </button>
            </div>
            <div className='a-modal-content-target'>
              <div className='a-page a-current-page'>
                <div className='modalPage'>
                  <div className='modal-content'>
                    <div className='modal-header a-modal-header'>
                      <div className='a-iconText a-iconText-background a-iconText-large'>
                        <div className='a-iconText-icon'>
                          <i className='fa fa-corp a-icon' aria-hidden='true' />
                        </div>
                        <h1 className='a-iconText-text mb-0'>
                          <span className='a-iconText-text-large'>Instantiate</span>
                        </h1>
                      </div>
                    </div>
                    <div className='modal-body a-modal-body'>
                      <img
                        src='https://amp.businessinsider.com/images/5c38effbbd77300f457905c7-960-480.png'
                        alt='maybe'
                      />
                      <button onClick={onClickInstantiate}>Instantiate</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
