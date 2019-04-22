import * as React from 'react';
import { connect } from 'react-redux';
import { GenericComponentWrapper } from '../components/GenericComponent';

import { ILayout } from '../features/form/layout/types';
import { IRuntimeState } from '../types';

export interface IContainerProps {
  components: any;
  textResources: any;
}

const ContainerComponent = (props: IContainerProps) => {
  console.log('CONTAINER PROPS', props);
  const formComponents: any[] = [];
  /*Object.values(props.components).forEach((obj: any, key: number) => {
    const formComponentIds = Object.keys(props.components);
    obj.id = formComponentIds[key];
    formComponents.push(obj);
  });*/

  const handleComponentDataUpdate = () => {
    // something
  };

  const getTextResource = (resourceKey: string): string => {
    const textResource = props.textResources.find((resource: any) => resource.id === resourceKey);
    return textResource ? textResource.value : resourceKey;
  };

  return (
    <div className='modal-body'>
      hello
    </div>
  );

};

const mapStateToProps = (state: IRuntimeState): IContainerProps => {
  return {
    components: state.formLayout,
    textResources: state.formDataModel.dataModel || [],
  };
};
export const Container = connect(mapStateToProps)(ContainerComponent);
