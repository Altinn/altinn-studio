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

export interface IRuleModelFieldElement {
  type: string;
  name: string;
  inputs: any;
}
