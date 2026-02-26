import type { CodeListDataNew } from '../CodeListDataNew';

export type PublishCodeListPayload = Required<Pick<CodeListDataNew, 'codeList' | 'title'>>;
