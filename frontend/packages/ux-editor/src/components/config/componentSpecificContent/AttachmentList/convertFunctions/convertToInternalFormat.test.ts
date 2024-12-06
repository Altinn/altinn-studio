import { convertExternalToInternalFormat } from './convertToInternalFormat';
import { reservedDataTypes } from '../attachmentListUtils';
import type { AvailableAttachementLists, InternalDataTypesFormat } from '../types';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('Convert to internal format: convertExternalToInternalFormat', () => {
  type TestCaseConvertInternalFormat = {
    availableAttachments: AvailableAttachementLists;
    dataTypeIds: string[];
    expectedResult: InternalDataTypesFormat;
  };

  describe('convert all data', () => {
    const testCasesAllDataTypes: KeyValuePairs<TestCaseConvertInternalFormat> = {
      'all attachments and current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
        expectedResult: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
      },
      'all attachments and all tasks and pdf': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: [reservedDataTypes.includeAll],
        expectedResult: {
          currentTask: false,
          includePdf: true,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      'all attachments and current task': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: [reservedDataTypes.currentTask],
        expectedResult: {
          currentTask: true,
          includePdf: false,
          selectedDataTypes: ['attachment2'],
        },
      },
      'all attachments and all tasks': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: [],
        expectedResult: {
          currentTask: false,
          includePdf: false,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      'some attachments and current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: ['attachment2', reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
        expectedResult: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
      },
      'all tasks and pdf': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment1'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: ['attachment1', reservedDataTypes.refDataAsPdf],
        expectedResult: {
          currentTask: false,
          includePdf: true,
          selectedDataTypes: ['attachment1'],
        },
      },
      'only pdf': {
        availableAttachments: {
          attachmentsCurrentTasks: ['attachment1'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: [reservedDataTypes.refDataAsPdf],
        expectedResult: {
          currentTask: false,
          includePdf: true,
          selectedDataTypes: [],
        },
      },
    };

    const testCaseNames: (keyof typeof testCasesAllDataTypes)[] =
      Object.keys(testCasesAllDataTypes);

    it.each(testCaseNames)('should convert to internal format with %s', (testCaseName) => {
      const testCase = testCasesAllDataTypes[testCaseName];
      expect(
        convertExternalToInternalFormat(testCase.availableAttachments, testCase.dataTypeIds),
      ).toEqual(testCase.expectedResult);
    });
  });
});
