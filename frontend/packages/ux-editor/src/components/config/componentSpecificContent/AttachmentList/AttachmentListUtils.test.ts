import {
  convertInternalToExternalFormat,
  reservedDataTypes,
  convertExternalToInternalFormat,
  getTasks,
  selectionIsValid,
} from './AttachmentListUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';

describe('Convert to external format: convertInternalToExternalFormat', () => {
  type TestCaseExternal = {
    selectedDataTypes: string[];
    availableAttachments: string[];
    expected: string[];
  };

  describe('convert all data', () => {
    const testCasesAllDataTypes: KeyValuePairs<TestCaseExternal> = {
      'current task and pdf': {
        selectedDataTypes: [
          'attachment1',
          'attachment2',
          reservedDataTypes.currentTask,
          reservedDataTypes.refDataAsPdf,
        ],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
      },
      'all tasks and pdf': {
        selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.includeAll],
      },
      'current task': {
        selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.currentTask],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.currentTask],
      },
      'all tasks': {
        selectedDataTypes: ['attachment1', 'attachment2'],
        availableAttachments: ['attachment1', 'attachment2'],
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
          convertInternalToExternalFormat(
            testCase.selectedDataTypes,
            testCase.availableAttachments,
          ),
        ).toEqual(testCase.expected);
      },
    );
  });

  describe('convert some data', () => {
    const testCasesSomeDataTypes: KeyValuePairs<TestCaseExternal> = {
      'current task and pdf': {
        selectedDataTypes: [
          'attachment1',
          reservedDataTypes.currentTask,
          reservedDataTypes.refDataAsPdf,
        ],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: ['attachment1', reservedDataTypes.currentTask, reservedDataTypes.refDataAsPdf],
      },
      'all tasks': {
        selectedDataTypes: ['attachment1'],
        availableAttachments: ['attachment1', 'attachment2'],
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
          convertInternalToExternalFormat(
            testCase.selectedDataTypes,
            testCase.availableAttachments,
          ),
        ).toEqual(testCase.expected);
      },
    );
  });
});

describe('Convert to internal format: convertExternalToInternalFormat', () => {
  type TestCaseInternal = {
    dataTypeIds: string[];
    expected: {
      availableAttachments: string[];
      selectedDataTypes: string[];
    };
  };

  const appMetaData: Partial<ApplicationMetadata['dataTypes']> = [
    { id: 'attachment0', taskId: 'Task_1', appLogic: {} },
    { id: 'attachment1', taskId: 'Task_1' },
    { id: 'attachment2', taskId: 'Task_2' },
    { id: reservedDataTypes.refDataAsPdf },
  ];
  const layoutSets: LayoutSets = {
    sets: [
      {
        id: 'layoutSetId1',
        dataTypes: 'layoutSetId1',
        tasks: ['Task_1'],
      },
      {
        id: 'layoutSetId2',
        dataTypes: 'layoutSetId2',
        tasks: ['Task_2'],
      },
    ],
  };
  const currentLayoutSet = 'layoutSetId2';

  describe('convert all data', () => {
    const testCasesAllDataTypes: KeyValuePairs<TestCaseInternal> = {
      'current task and pdf': {
        dataTypeIds: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
        expected: {
          availableAttachments: ['attachment2'],
          selectedDataTypes: [
            'attachment2',
            reservedDataTypes.refDataAsPdf,
            reservedDataTypes.currentTask,
          ],
        },
      },
      'all tasks and pdf': {
        dataTypeIds: [reservedDataTypes.includeAll],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        },
      },
      'current task': {
        dataTypeIds: [reservedDataTypes.currentTask],
        expected: {
          availableAttachments: ['attachment2'],
          selectedDataTypes: ['attachment2', reservedDataTypes.currentTask],
        },
      },
      'all tasks': {
        dataTypeIds: [],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      'some tasks': {
        dataTypeIds: ['attachment1', 'attachment2'],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      'some tasks and pdf': {
        dataTypeIds: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        },
      },
    };

    const testCaseNames: (keyof typeof testCasesAllDataTypes)[] =
      Object.keys(testCasesAllDataTypes);

    it.each(testCaseNames)(
      'should convert to internal format with all attachments and %s',
      (testCaseName) => {
        const testCase = testCasesAllDataTypes[testCaseName];
        const tasks = getTasks(
          layoutSets,
          currentLayoutSet,
          testCase.dataTypeIds.includes(reservedDataTypes.currentTask),
        );

        expect(convertExternalToInternalFormat(tasks, appMetaData, testCase.dataTypeIds)).toEqual(
          testCase.expected,
        );
      },
    );
  });

  describe('convert some data', () => {
    const testCasesSomeDataTypes: KeyValuePairs<TestCaseInternal> = {
      'current task and pdf': {
        dataTypeIds: ['attachment2', reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
        expected: {
          availableAttachments: ['attachment2'],
          selectedDataTypes: [
            'attachment2',
            reservedDataTypes.refDataAsPdf,
            reservedDataTypes.currentTask,
          ],
        },
      },
      'all tasks': {
        dataTypeIds: ['attachment1'],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1'],
        },
      },
    };

    const testCaseNames: (keyof typeof testCasesSomeDataTypes)[] =
      Object.keys(testCasesSomeDataTypes);

    it.each(testCaseNames)(
      'should convert to internal format with some attachments and %s',
      (testCaseName) => {
        const testCase = testCasesSomeDataTypes[testCaseName];
        const tasks = getTasks(
          layoutSets,
          currentLayoutSet,
          testCase.dataTypeIds.includes(reservedDataTypes.currentTask),
        );

        expect(convertExternalToInternalFormat(tasks, appMetaData, testCase.dataTypeIds)).toEqual(
          testCase.expected,
        );
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
