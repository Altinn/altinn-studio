import {
  convertInternalToExternalFormat,
  reservedDataTypes,
  convertExternalToInternalFormat,
  selectionIsValid,
} from './AttachmentListUtils';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

type TestCaseConvertFormat = {
  availableAttachments: {
    attachmentsCurrentTask: string[];
    attachmentsAllTasks: string[];
  };
  dataTypeIds: {
    currentTask: boolean;
    includePdf: boolean;
    selectedDataTypes: string[];
  };
  expected: string[];
};

describe('Convert to external format: convertInternalToExternalFormat', () => {
  describe('Convert all data', () => {
    const testCasesAllDataTypes: KeyValuePairs<TestCaseConvertFormat> = {
      'current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
        expected: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
      },
      'all tasks and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: true,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
        expected: [reservedDataTypes.includeAll],
      },
      'current task': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: false,
          selectedDataTypes: ['attachment2'],
        },
        expected: [reservedDataTypes.currentTask],
      },
      'all tasks': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment1', 'attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: false,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
        expected: [],
      },
    };

    const testCaseNames: (keyof typeof testCasesAllDataTypes)[] =
      Object.keys(testCasesAllDataTypes);

    it.each(testCaseNames)(
      'should convert to external format with all attachments and %s',
      (testCaseName) => {
        const testCase = testCasesAllDataTypes[testCaseName];
        expect(
          convertInternalToExternalFormat(testCase.availableAttachments, testCase.dataTypeIds),
        ).toEqual(testCase.expected);
      },
    );
  });

  describe('Convert some data', () => {
    const testCasesSomeDataTypes: KeyValuePairs<TestCaseConvertFormat> = {
      'current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
        expected: ['attachment2', reservedDataTypes.currentTask, reservedDataTypes.refDataAsPdf],
      },
      'all tasks': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: false,
          selectedDataTypes: ['attachment1'],
        },
        expected: ['attachment1'],
      },
    };

    const testCaseNames: (keyof typeof testCasesSomeDataTypes)[] =
      Object.keys(testCasesSomeDataTypes);

    it.each(testCaseNames)(
      'should convert to external format with some attachments and %s',
      (testCaseName) => {
        const testCase = testCasesSomeDataTypes[testCaseName];
        expect(
          convertInternalToExternalFormat(testCase.availableAttachments, testCase.dataTypeIds),
        ).toEqual(testCase.expected);
      },
    );
  });
});

describe('Convert to internal format: convertExternalToInternalFormat', () => {
  describe('convert all data', () => {
    const testCasesAllDataTypes: KeyValuePairs<TestCaseConvertFormat> = {
      'current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
        expected: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
      },
      'all tasks and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: true,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
        expected: [reservedDataTypes.includeAll],
      },
      'current task': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: false,
          selectedDataTypes: ['attachment2'],
        },
        expected: [reservedDataTypes.currentTask],
      },
      'all tasks': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: false,
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
        expected: [],
      },
    };

    const testCaseNames: (keyof typeof testCasesAllDataTypes)[] =
      Object.keys(testCasesAllDataTypes);

    it.each(testCaseNames)(
      'should convert to internal format with all attachments and %s',
      (testCaseName) => {
        const testCase = testCasesAllDataTypes[testCaseName];
        expect(
          convertExternalToInternalFormat(testCase.availableAttachments, testCase.dataTypeIds),
        ).toEqual(testCase.expected);
      },
    );
  });

  describe('convert some data', () => {
    const testCasesSomeDataTypes: KeyValuePairs<TestCaseConvertFormat> = {
      'current task and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment2'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: true,
          includePdf: true,
          selectedDataTypes: ['attachment2'],
        },
        expected: [reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
      },
      'all tasks and pdf': {
        availableAttachments: {
          attachmentsCurrentTask: ['attachment1'],
          attachmentsAllTasks: ['attachment1', 'attachment2'],
        },
        dataTypeIds: {
          currentTask: false,
          includePdf: false,
          selectedDataTypes: ['attachment1'],
        },
        expected: ['attachment1', reservedDataTypes.refDataAsPdf],
      },
    };

    const testCaseNames: (keyof typeof testCasesSomeDataTypes)[] =
      Object.keys(testCasesSomeDataTypes);

    it.each(testCaseNames)(
      'should convert to internal format with some attachments and %s',
      (testCaseName) => {
        const testCase = testCasesSomeDataTypes[testCaseName];

        expect(
          convertExternalToInternalFormat(testCase.availableAttachments, testCase.dataTypeIds),
        ).toEqual(testCase.expected);
      },
    );
  });
});

describe('validateSelection', () => {
  it('should return false when no selection', () => {
    expect(selectionIsValid([])).toBeFalsy();
  });

  it('should return true when there is a selection', () => {
    expect(selectionIsValid(['attachment1'])).toBeTruthy();
  });

  it('should return true when there is a selection and current task', () => {
    expect(selectionIsValid(['attachment1', reservedDataTypes.currentTask])).toBeTruthy();
  });

  it('should return false when there is only current task', () => {
    expect(selectionIsValid([reservedDataTypes.currentTask])).toBeFalsy();
  });

  it('should return true when there is only pdf', () => {
    expect(selectionIsValid([reservedDataTypes.refDataAsPdf])).toBeTruthy;
  });
});
