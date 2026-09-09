import type { DataModelBinding } from './DataModelBinding';
import type { FormComponentAction } from './FormComponentAction';

export type FormComponentProps = {
  title: string;
  dataModelBinding: DataModelBinding;
  onAction: (action: FormComponentAction) => void;
};
