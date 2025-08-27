import type { CodeListsResponse } from '../types/api/CodeListsResponse';
import type { CodeListData } from '@studio/content-library';
import {
  description1TextResource,
  description2TextResource,
  helpText1TextResource,
  helpText2TextResource,
  label1TextResource,
  label2TextResource,
  label3TextResource,
  label4TextResource,
  label5TextResource,
} from 'app-shared/mocks/textResourcesMock';

const codeList1: CodeListData = {
  title: 'codeList1',
  data: [
    {
      description: description1TextResource.id,
      helpText: helpText1TextResource.id,
      label: label1TextResource.id,
      value: 'item1',
    },
    {
      description: description2TextResource.id,
      helpText: helpText2TextResource.id,
      label: label2TextResource.id,
      value: 'item2',
    },
  ],
};

const codeList2: CodeListData = {
  title: 'codeList2',
  data: [
    { label: label3TextResource.id, value: 'a' },
    { label: label4TextResource.id, value: 'b' },
    { label: label5TextResource.id, value: 'c' },
  ],
};

const codeListWithError: CodeListData = {
  title: 'codeListWithError',
  hasError: true,
};

export const codeListsResponse: CodeListsResponse = [codeList1, codeList2, codeListWithError];
