import { IAppDataState } from '../reducers/appDataReducer';
import { IErrorState } from '../reducers/errorReducer';
import { IFormDesignerState } from '../reducers/formDesignerReducer';
import { IFormFillerState } from '../reducers/formFillerReducer';
import { IServiceConfigurationState } from '../reducers/serviceConfigurationReducer';
import { IWorkflowState } from '../reducers/workflowReducer';

declare global {
  export interface IFormDesignerNameSpace<T1, T2, T3, T4, T5, T6> {
    formDesigner: T1;
    formFiller: T2;
    serviceConfigurations: T3;
    appData: T4;
    errors: T5;
    workflow: T6;
  }
  export interface IAppState
    extends IFormDesignerNameSpace
    <IFormDesignerState,
    IFormFillerState,
    IServiceConfigurationState,
    IAppDataState,
    IErrorState,
    IWorkflowState> { }
  export interface IAltinnEditableComponent {
    ModalContent: () => JSX.Element;
  }

  export interface IContainerProvidedProps {
    containerIndex: number;
  }

  export interface IRowProvidedProps {
    containerIndex: number;
    rowIndex: number;
  }

  export interface IColumnProvidedProps {
    containerIndex: number;
    rowIndex: number;
    columnIndex: number;
  }

  export interface IOptions {
    label: string;
    value: any;
  }

  export interface ICreateFormContainer {
    repeating: boolean;
    dataModelGroup: string;
    index?: number;
    hidden?: boolean;
  }

  export interface ITextResourceBindings {
    [id: string]: string;
  }

  export interface ICreateFormComponent {
    component: string;
    type?: string;
    name?: string;
    size?: string;
    options?: IOptions[];
    dataModelBindings?: IDataModelBindings;
    textResourceBindings?: ITextResourceBindings;
    customType?: string;
    codeListId?: string;
    triggerValidation?: boolean;
    handleUpdateElement?: (component: FormComponentType) => void;
    handleDeleteElement?: () => void;
    handleUpdateFormData?: (formData: any) => void;
    handleUpdateDataModel?: (dataModelBinding: string) => void;
  }

  export interface IFormComponent extends ICreateFormComponent {
    id: string;
    disabled?: boolean;
    required?: boolean;
    hidden?: boolean;
    readOnly?: boolean;
  }

  export interface IFormHeaderComponent extends IFormComponent {
    size: string;
  }

  export interface IFormInputComponent extends IFormComponent {
    type: string;
    disabled?: boolean;
  }

  export interface IFormCheckboxComponent extends IFormComponent {
    options: IOptions[];
    preselectedOptionIndex?: number;
  }

  export interface IFormTextAreaComponent extends IFormComponent { }

  export interface IFormButtonComponent extends IFormComponent {
    onClickAction: () => void;
  }

  export interface IFormRadioButtonComponent extends IFormComponent {
    options: IOptions[];
    preselectedOptionIndex?: number;
  }

  export interface IFormDropdownComponent extends IFormComponent {
    options: IOptions[];
  }

  export interface IFormFileUploaderComponent extends IFormComponent {
    description: string;
    hasCustomFileEndings: boolean;
    maxFileSizeInMB: number;
    displayMode: string;
    maxNumberOfAttachments: number;
    validFileEndings?: string;
  }

  export interface IDataModelBindings {
    [id: string]: string;
  }

  export interface IFormAddressComponent extends IFormComponent {
    simplified: boolean;
  }

  export type FormComponentType =
    | IFormComponent
    | IFormHeaderComponent
    | IFormInputComponent
    | IFormCheckboxComponent
    | IFormTextAreaComponent
    | IFormButtonComponent
    | IFormRadioButtonComponent
    | IFormDropdownComponent
    | IFormFileUploaderComponent
    | IFormAddressComponent;

  export interface IFormDesignerComponent {
    [id: string]: IFormComponent;
  }

  export interface IFormDesignerContainer {
    [id: string]: ICreateFormContainer;
  }

  export interface IFormDesignerLayout {
    components: IFormDesignerComponent;
    containers: IFormDesignerContainer;
    order: IFormLayoutOrder;
  }

  export interface IFormLayoutOrder {
    [id: string]: string[];
  }

  export interface IServiceConfiguration {

  }

  export interface ISelectedLayoutElement {
    elementId: string;
    elementType: string;
    indexes: number[];
  }

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

  export interface IDataModelBinding {
    fieldName: string;
    parentGroup: string;
  }

  /**
   * Defines how each element in the code list element list looks like
   */
  export interface ICodeListListElement {
    codeListName: string;
    org: string;
    id: number;
  }

  export interface IAltinnWindow extends Window {
    org: string;
    service: string;
    instanceId: string;
    reportee: string;
  }

  export interface IRuleModelFieldElement {
    type: string;
    name: string;
    inputs: any;
  }

  export interface ITextResource {
    id: string;
    value: string;
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
  export interface IAttachment {
    uploaded: boolean;
    deleting: boolean;
    name: string;
    size: number;
    id: string;
  }

  export interface IAttachments {
    [attachmentType: string]: IAttachment[];
  }

  export interface IAttachmentListApiResponse {
    type: string;
    attachments: IAttachmentApiResponse[];
  }

  export interface IAttachmentApiResponse {
    name: string;
    size: number;
    id: string;
  }
}
