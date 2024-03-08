import {
  dataExternalFormat,
  reservedDataTypes,
  dataInternalFormat,
  getTasks,
  selectionIsValid,
} from './AttachmentListUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

const useCasesDesc = ['current task and pdf', 'all tasks and pdf', 'current task', 'all tasks'];

describe('Convert to external format: dataExternalFormat', () => {
  describe('convert all data', () => {
    const useCasesAllAttachments = [
      {
        selectedDataTypes: [
          'attachment1',
          'attachment2',
          reservedDataTypes.currentTask,
          reservedDataTypes.refDataAsPdf,
        ],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
      },
      {
        selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.includeAll],
      },
      {
        selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.currentTask],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [reservedDataTypes.currentTask],
      },
      {
        selectedDataTypes: ['attachment1', 'attachment2'],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: [],
      },
    ];

    useCasesAllAttachments.forEach((useCase, index) => {
      it(`should convert to external format with all attachments and ${useCasesDesc[index]}`, () => {
        expect(dataExternalFormat(useCase.selectedDataTypes, useCase.availableAttachments)).toEqual(
          useCase.expected,
        );
      });
    });
  });

  describe('convert some data', () => {
    const useCasesSomeAttachments = [
      {
        selectedDataTypes: [
          'attachment1',
          reservedDataTypes.currentTask,
          reservedDataTypes.refDataAsPdf,
        ],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: ['attachment1', reservedDataTypes.currentTask, reservedDataTypes.refDataAsPdf],
      },
      {
        selectedDataTypes: ['attachment1'],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: ['attachment1'],
      },
    ];

    useCasesSomeAttachments.forEach((useCase, index) => {
      it(`should convert to external format with some attachments and ${useCasesDesc[index]}`, () => {
        expect(dataExternalFormat(useCase.selectedDataTypes, useCase.availableAttachments)).toEqual(
          useCase.expected,
        );
      });
    });
  });
});

describe('Convert to internal format: dataInternalFormat', () => {
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
    const useCasesAllDataTypes = [
      {
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
      {
        dataTypeIds: [reservedDataTypes.includeAll],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        },
      },
      {
        dataTypeIds: [reservedDataTypes.currentTask],
        expected: {
          availableAttachments: ['attachment2'],
          selectedDataTypes: ['attachment2', reservedDataTypes.currentTask],
        },
      },
      {
        dataTypeIds: [],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      {
        dataTypeIds: ['attachment1', 'attachment2'],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2'],
        },
      },
      {
        dataTypeIds: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1', 'attachment2', reservedDataTypes.refDataAsPdf],
        },
      },
    ];

    useCasesAllDataTypes.forEach((useCase, index) => {
      it(`should convert to internal format with all attachments and ${useCasesDesc[index]} `, () => {
        const tasks = getTasks(
          layoutSets,
          currentLayoutSet,
          useCase.dataTypeIds.includes(reservedDataTypes.currentTask),
        );

        expect(dataInternalFormat(tasks, appMetaData, useCase.dataTypeIds)).toEqual(
          useCase.expected,
        );
      });
    });
  });

  describe('convert some data', () => {
    const useCasesSomeDataTypes = [
      {
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
      {
        dataTypeIds: ['attachment1'],
        expected: {
          availableAttachments: ['attachment1', 'attachment2'],
          selectedDataTypes: ['attachment1'],
        },
      },
    ];

    useCasesSomeDataTypes.forEach((useCase, index) => {
      it(`should convert to internal format with some attachments and ${useCasesDesc[index]}`, () => {
        const tasks = getTasks(
          layoutSets,
          currentLayoutSet,
          useCase.dataTypeIds.includes(reservedDataTypes.currentTask),
        );

        expect(dataInternalFormat(tasks, appMetaData, useCase.dataTypeIds)).toEqual(
          useCase.expected,
        );
      });
    });
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
