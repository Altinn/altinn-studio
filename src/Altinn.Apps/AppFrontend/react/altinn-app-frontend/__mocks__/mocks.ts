import { IApplicationMetadata } from 'src/shared/resources/applicationMetadata';
import applicationMetadata from './applicationMetadatamock.json';

export { getFormLayoutStateMock } from './formLayoutStateMock';
export { getInitialStateMock } from './initialStateMock';
export { getFormDataStateMock } from './formDataStateMock';
export { getLanguageFromCode as getLanguageMock } from '../src/shared/resources/language/languages';
export const applicationMetadataMock = applicationMetadata as IApplicationMetadata;
