import { useSelector } from 'react-redux';
import { renderSelectDataModelBinding } from '../../utils/render';
import { IAppState } from '../../types/global';
import { IGenericEditComponent } from './componentConfig';
import { getMinOccursFromDataModel, getXsdDataTypeFromDataModel } from '../../utils/datamodel';
import { ComponentTypes } from '../index';

export const EditDataModelBindings = ({
  component,
  handleComponentChange,
}: IGenericEditComponent) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const dataModel = useSelector((state: IAppState) => state.appData.dataModel.model);

  const handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    handleComponentChange({
      ...component,
      dataModelBindings: {
        ...component.dataModelBindings,
        [key]: selectedDataModelElement,
      },
      required: getMinOccursFromDataModel(selectedDataModelElement, dataModel) > 0,
      timeStamp: component.type === ComponentTypes.Datepicker ?
        getXsdDataTypeFromDataModel(selectedDataModelElement, dataModel) ==='DateTime' : undefined,
    })
  }

  return renderSelectDataModelBinding(
    component.dataModelBindings,
    handleDataModelChange,
    language,
  );
}
