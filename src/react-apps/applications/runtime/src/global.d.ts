import * as LayoutTypes from './features/form/layout/types';

declare global {
  // TODO: Find out how we should handle global types => declare them by feature and export all here?
  export interface IDataModelFieldElement {
    ID: string;
    Choices?: any;
    CustomProperties?: any;
    DataBindingName: string;
    FixedValue?: any;
    IsReadOnly: boolean;
    IsTagContent: boolean;
    MaxOccurs: number;
    MinOccurs: number;
    Name: string;
    ParentElement: string;
    Restrictions: any;
    Texts: any;
    Type: string;
    TypeName?: string;
    XName?: string;
    XPath: string;
    XsdValueType?: string;
    DisplayString: string;
    XmlSchemaXPath: string;
    JsonSchemaPointer: string;
  }

  export interface IComponentBindingValidation {
    errors?: string[];
    warnings?: string[];
  }

  export interface IComponentValidations {
    [id: string]: IComponentBindingValidation;
  }

  export interface IValidationResults {
    [id: string]: IComponentValidations;
  }
}
