import * as React from 'react';

export interface IThirdPartyComponentProps {
  id: string;
}

export const thirdPartyComponentWithElementHandler =
  (component: React.ReactElement<any>, dataChangeHandleCallback: (data: any) => void):
    React.ReactElement<any> => {

    const onHandleDataUpdate = (data: any) => dataChangeHandleCallback(data);

    return (
      React.cloneElement(
        component,
        {
          onHandleDataUpdate,
        }
      )
    );
  }