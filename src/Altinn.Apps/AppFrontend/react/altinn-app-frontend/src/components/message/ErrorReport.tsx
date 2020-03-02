import * as React from 'react';
import { getLanguageFromKey } from 'altinn-shared/utils';

const ErrorReport = (props: any) => {
    if (!props.formHasErrors) {
      return null;
    }

    return (
      <div id='errorReport' className='a-modal-content-target' style={{ marginTop: '55px' }}>
        <div className='a-page a-current-page'>
          <div className='modalPage'>
            <div className='modal-content'>
              <div className='modal-body' style={{paddingBottom: '0px'}}>
                <div className='a-iconText' style={{minHeight: '60px'}}>
                  <div className='a-iconText-icon'>
                    <i
                      className='ai ai-circle-exclamation a-icon'
                      style={{
                        color: '#E23B53',
                        fontSize: '4em',
                        marginLeft: '12px',
                      }}
                      aria-hidden='true'
                    />
                  </div>
                    <h2 className='a-fontReg' style={{marginBottom: '0px', marginLeft: '12px'}}>
                      <span className='a-iconText-text-large'>
                        {getLanguageFromKey('form_filler.error_report_header', props.language)}
                      </span>
                    </h2>
                </div>
              </div>
              <div className='modal-body a-modal-body' style={{paddingTop: '0px', paddingBottom: '24px'}}>
                <h4 className='a-fontReg'>
                  <span>
                  {getLanguageFromKey('form_filler.error_report_description', props.language)}
                  </span>
                </h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
}

export default ErrorReport;