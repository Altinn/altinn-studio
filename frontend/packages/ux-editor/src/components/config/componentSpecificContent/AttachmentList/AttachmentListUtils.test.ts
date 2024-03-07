import {
  attachmentsToExternalFormat,
  reservedDataTypes,
  dataToInternalFormat,
  getTasks,
} from './AttachmentListUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';

type ConvertAttachmentsToBackendTestArgs = {
  selectedDataTypes: string[];
  availableAttachments: string[];
  expected: string[];
};
const useCasesDesc = ['current task and pdf', 'all tasks and pdf', 'current task', 'all tasks'];

describe('Convert to external format: attachmentsToExternalFormat', () => {
  describe('convert all attachments: allToExternalFormat', () => {
    const useCasesAllAttachments: ConvertAttachmentsToBackendTestArgs[] = [
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
        expect(
          attachmentsToExternalFormat(useCase.selectedDataTypes, useCase.availableAttachments),
        ).toEqual(useCase.expected);
      });
    });
  });

  describe('convert some attachments: someToExternalFormat', () => {
    const useCasesSomeAttachments: ConvertAttachmentsToBackendTestArgs[] = [
      {
        selectedDataTypes: [
          'attachment1',
          reservedDataTypes.currentTask,
          reservedDataTypes.refDataAsPdf,
        ],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: ['attachment1', reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
      },
      {
        selectedDataTypes: ['attachment1'],
        availableAttachments: ['attachment1', 'attachment2'],
        expected: ['attachment1'],
      },
    ];

    useCasesSomeAttachments.forEach((useCase, index) => {
      it(`should convert to external format with some attachments and ${useCasesDesc[index]}`, () => {
        expect(
          attachmentsToExternalFormat(useCase.selectedDataTypes, useCase.availableAttachments),
        ).toEqual(useCase.expected);
      });
    });
  });
});

describe('Convert to internal format: dataToInternalFormat', () => {
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

  describe('convert all attachments: dataToInternalFormat', () => {
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

        expect(dataToInternalFormat(tasks, appMetaData, useCase.dataTypeIds)).toEqual(
          useCase.expected,
        );
      });
    });
  });

  describe('convert some attachments: dataToInternalFormat', () => {
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

        expect(dataToInternalFormat(tasks, appMetaData, useCase.dataTypeIds)).toEqual(
          useCase.expected,
        );
      });
    });
  });
});
