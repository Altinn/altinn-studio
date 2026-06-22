export * from './FormComponent';
export type { FormComponentProps } from './types/FormComponentProps';
export type {
  FormComponentAction,
  FormComponentActionPayloadMap,
  PatchDataModelPayload,
} from './types/FormComponentAction';
export { FormComponentActionType } from './types/FormComponentActionType';
export type { DataModelBinding } from './types/DataModelBinding';

export { LanguageTranslatorProvider } from './LanguageTranslatorProvider';

export { parseAndCleanText, isElement } from './text/parseAndCleanText';
export type { ParserReplace } from './text/parseAndCleanText';

export * from './app-components';
export * from './layout-components';
export * from './layout-components/common/HelpTextContainer';
export * from './layout-components/common/LabelComponent';
export * from './layout-components/common/Description';
export * from './layout-components/common/OptionalIndicator';
export * from './layout-components/common/RequiredIndicator';
export { getLabelId, getDescriptionId } from './layout-components/utils/labelIds';
