import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { AvailableAttachementLists, InternalDataTypesFormat } from '../types';
import { reservedDataTypes } from '../attachmentListUtils';
import { convertInternalToExternalFormat } from './convertToExternalFormat';

describe('Convert to external format: convertInternalToExternalFormat', () => {
  type TestCaseConvertToExternalFormat = {
    availableAttachments: AvailableAttachementLists;
    internalFormat: InternalDataTypesFormat;
    expectedResult: string[];
  };

  const testCasesDataTypes: KeyValuePairs<TestCaseConvertToExternalFormat> = {
    'all attachments and current task and pdf': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment2'],
        attachmentsAllTasks: ['attachment1', 'attachment2'],
      },
      internalFormat: {
        currentTask: true,
        includePdf: true,
        selectedDataTypes: ['attachment2'],
      },
      expectedResult: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
    },
    'all attachments and all tasks and pdf': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment2'],
        attachmentsAllTasks: ['attachment1', 'attachment2'],
      },
      internalFormat: {
        currentTask: false,
        includePdf: true,
        selectedDataTypes: ['attachment1', 'attachment2'],
      },
      expectedResult: [reservedDataTypes.includeAll],
    },
    'all attachments and current task': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment2'],
        attachmentsAllTasks: ['attachment1', 'attachment2'],
      },
      internalFormat: {
        currentTask: true,
        includePdf: false,
        selectedDataTypes: ['attachment2'],
      },
      expectedResult: [reservedDataTypes.currentTask],
    },
    'all attachments and all tasks': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment1', 'attachment2'],
        attachmentsAllTasks: ['attachment1', 'attachment2'],
      },
      internalFormat: {
        currentTask: false,
        includePdf: false,
        selectedDataTypes: ['attachment1', 'attachment2'],
      },
      expectedResult: [],
    },
    'some attachments and current task and pdf': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment2', 'attachment3'],
        attachmentsAllTasks: ['attachment1', 'attachment2', 'attachment3'],
      },
      internalFormat: {
        currentTask: true,
        includePdf: true,
        selectedDataTypes: ['attachment2'],
      },
      expectedResult: [
        'attachment2',
        reservedDataTypes.refDataAsPdf,
        reservedDataTypes.currentTask,
      ],
    },
    'some attachments and all tasks': {
      availableAttachments: {
        attachmentsCurrentTasks: ['attachment2'],
        attachmentsAllTasks: ['attachment1', 'attachment2'],
      },
      internalFormat: {
        currentTask: false,
        includePdf: false,
        selectedDataTypes: ['attachment1'],
      },
      expectedResult: ['attachment1'],
    },
  };

  const testCaseNames: (keyof typeof testCasesDataTypes)[] = Object.keys(testCasesDataTypes);

  it.each(testCaseNames)('should convert to external format with %s', (testCaseName) => {
    const testCase = testCasesDataTypes[testCaseName];
    expect(
      convertInternalToExternalFormat(testCase.availableAttachments, testCase.internalFormat),
    ).toEqual(testCase.expectedResult);
  });
});
