import * as React from 'react';
import { Navigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from 'src/common/hooks';
import { InstantiationActions } from 'src/features/instantiate/instantiation/instantiationSlice';
import { useInstantiateWithPrefillMutation } from 'src/services/InstancesApi';
import { AttachmentActions } from 'src/shared/resources/attachments/attachmentSlice';
import { InstanceDataActions } from 'src/shared/resources/instanceData/instanceDataSlice';
import { mapFormData } from 'src/utils/databindings';
import type { IComponentProps } from 'src/components';
import type { ILayoutCompInstantiationButton } from 'src/features/form/layout';

import { AltinnLoader } from 'altinn-shared/components';

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

export type IInstantiationButtonProps = IComponentProps &
  Omit<ILayoutCompInstantiationButton, 'type'>;

export function InstantiationButtonComponent(props: IInstantiationButtonProps) {
  const dispatch = useAppDispatch();
  const [instantiateWithPrefill, { isSuccess, data, isLoading, isError }] =
    useInstantiateWithPrefillMutation();
  const formData = useAppSelector((state) => state.formData.formData);
  const party = useAppSelector((state) => state.party.selectedParty);

  const instantiate = () => {
    const prefill = mapFormData(formData, props.mapping);
    instantiateWithPrefill({
      prefill,
      instanceOwner: {
        partyId: party.partyId.toString(),
      },
    });
  };

  React.useEffect(() => {
    if (isSuccess) {
      dispatch(InstanceDataActions.getFulfilled({ instanceData: data }));
      dispatch(AttachmentActions.mapAttachments());
      dispatch(
        InstantiationActions.instantiateFulfilled({ instanceId: data.id }),
      );
    }
  }, [isSuccess, data, dispatch]);

  React.useEffect(() => {
    if (isError) {
      throw new Error('something went wrong trying to start new instance');
    }
  }, [isError]);

  if (data?.id) {
    return <Navigate to={`/instance/${data.id}`} />;
  }

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
            {!isLoading ? (
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
            ) : (
              <AltinnLoader
                srContent={'Laster'}
                style={altinnLoaderStyle}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InstantiationButtonComponent;
