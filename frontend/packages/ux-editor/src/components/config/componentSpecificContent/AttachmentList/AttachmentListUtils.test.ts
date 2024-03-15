import { reservedDataTypes, selectionIsValid } from './attachmentListUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { AvailableAttachementLists, InternalDataTypesFormat } from './types';
import { convertInternalToExternalFormat } from './convertToExternalFormat';
import { convertExternalToInternalFormat } from './convertToInternalFormat';

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

describe('validateSelection', () => {
  it('should return false when no selection', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: false,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeFalsy();
  });

  it('should return true when there is a selection', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: false,
      selectedDataTypes: ['attachment1'],
    };
    expect(selectionIsValid(output)).toBeTruthy();
  });

  it('should return true when there is a selection and current task', () => {
    const output: InternalDataTypesFormat = {
      currentTask: true,
      includePdf: false,
      selectedDataTypes: ['attachment1'],
    };
    expect(selectionIsValid(output)).toBeTruthy();
  });

  it('should return false when there is only current task', () => {
    const output: InternalDataTypesFormat = {
      currentTask: true,
      includePdf: false,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeFalsy();
  });

  it('should return true when there is only pdf', () => {
    const output: InternalDataTypesFormat = {
      currentTask: false,
      includePdf: true,
      selectedDataTypes: [],
    };
    expect(selectionIsValid(output)).toBeTruthy;
  });
});
