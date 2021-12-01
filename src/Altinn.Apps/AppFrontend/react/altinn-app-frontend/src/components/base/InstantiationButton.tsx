import { AltinnLoader } from 'altinn-shared/components';
import * as React from 'react';
import { useAppSelector } from 'src/common/hooks';
import { IInstantiationButtonProps } from 'src/features/form/layout';
import InstantiationActions from 'src/features/instantiate/instantiation/actions';
import { useInstantiateWithPrefillMutation } from 'src/services/InstancesApi';
import InstanceDataActions from 'src/shared/resources/instanceData/instanceDataActions';
import AttachmentActions from 'src/shared/resources/attachments/attachmentActions';
import { mapFormData } from 'src/utils/databindings';
import { Redirect } from 'react-router';

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

const altinnLoaderStyle = {
  marginLeft: '40px',
  marginTop: '2px',
  height: '45px',
};


export function InstantiationButton(props: IInstantiationButtonProps) {
  const [instantiateWithPrefill, {isSuccess, data, isLoading, isError}] = useInstantiateWithPrefillMutation();
  const formData = useAppSelector(state => state.formData.formData);
  const party = useAppSelector(state => state.party.selectedParty);

  const instantiate = () => {
    const prefill = mapFormData(formData, props.mapping);
    instantiateWithPrefill({
      prefill,
      instanceOwner: {
        partyId: party.partyId.toString(),
      }
    });
  };

  React.useEffect(() => {
    if (isSuccess) {
      InstanceDataActions.getInstanceDataFulfilled(data);
      AttachmentActions.mapAttachments();
      InstantiationActions.instantiateFulfilled(data.id);
    }
  }, [isSuccess, data])

  React.useEffect(() => {
    if (isError) {
      throw new Error('something went wrong trying to start new instance');
    }
  }, [isError])

  if (data?.id) {
    return (
      <Redirect to={`/instance/${data.id}`} />
    )
  }

  return (
    <div className='container pl-0'>
      <div className='a-btn-group' style={btnGroupStyle}>
        <div className='row' style={rowStyle}>
          <div className='pl-0 a-btn-sm-fullwidth'>
            {!isLoading ?
              <button
                type='submit'
                className='a-btn a-btn-success'
                id={props.id}
                style={buttonStyle}
                disabled={isLoading}
                onClick={instantiate}
              >
                {props.text}
              </button>
              :
              <AltinnLoader
                srContent={'Laster'}
                style={altinnLoaderStyle}
              />
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstantiationButton;
