import { useSelector } from 'react-redux';
import { renderSelectDataModelBinding } from '../../../utils/render';
import type { IAppState } from '../../../types/global';
import type { IGenericEditComponent } from '../componentConfig';
import { getMinOccursFromDataModel, getXsdDataTypeFromDataModel } from '../../../utils/datamodel';
import { ComponentTypes } from '../../index';
import { useText } from '../../../hooks';
import { textSelector } from '../../../selectors/textSelectors';

export interface EditDataModelBindingsProps extends IGenericEditComponent {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
}

export const EditDataModelBindings = ({
  component,
  handleComponentChange,
  renderOptions,
}: EditDataModelBindingsProps) => {
  const language = useSelector(textSelector);
  const dataModel = useSelector((state: IAppState) => state.appData.dataModel.model);
  const t = useText();

  const handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    handleComponentChange({
      ...component,
      dataModelBindings: {
        ...component.dataModelBindings,
        [key]: selectedDataModelElement,
      },
      required: getMinOccursFromDataModel(selectedDataModelElement, dataModel) > 0,
      timeStamp:
        component.type === ComponentTypes.Datepicker
          ? getXsdDataTypeFromDataModel(selectedDataModelElement, dataModel) === 'DateTime'
          : undefined,
    });
  };

  return renderSelectDataModelBinding({
    dataModelBinding: component.dataModelBindings,
    onDataModelChange: handleDataModelChange,
    language,
    t,
    ...renderOptions,
  });
};
