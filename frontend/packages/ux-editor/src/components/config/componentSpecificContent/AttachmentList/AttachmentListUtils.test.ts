import {
  attachmentsToExternalFormat,
  reservedDataTypes,
  dataToInternalFormat,
  getTasks,
} from './AttachmentListUtils';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { convertAttachmentsToBackendArgs } from './AttachmentListUtils';
import type { ApplicationMetadata, DataTypeElement } from 'app-shared/types/ApplicationMetadata';

type ConvertAttachmentsToBackendTestArgs = convertAttachmentsToBackendArgs & {
  expected: string[];
};
const useCasesDesc = ['current task and pdf', 'all tasks and pdf', 'current task', 'all tasks'];

describe('Convert to external format: attachmentsToExternalFormat', () => {
  describe('convert all attachments: allToExternalFormat', () => {
    const useCasesAllAttachments: ConvertAttachmentsToBackendTestArgs[] = [
      {
        includeAllAttachments: true,
        includePdf: true,
        onlyCurrentTask: true,
        selectedAttachments: [],
        expected: [reservedDataTypes.includeAll, reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: true,
        includePdf: true,
        onlyCurrentTask: false,
        selectedAttachments: [],
        expected: [reservedDataTypes.includeAll],
      },
      {
        includeAllAttachments: true,
        includePdf: false,
        onlyCurrentTask: true,
        selectedAttachments: [],
        expected: [reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: true,
        includePdf: false,
        onlyCurrentTask: false,
        selectedAttachments: [],
        expected: [],
      },
    ];

    useCasesAllAttachments.forEach((useCase, index) => {
      it(`should convert all attachments to backend with ${useCasesDesc[index]}`, () => {
        expect(attachmentsToExternalFormat(useCase)).toEqual(useCase.expected);
      });
    });
  });

  describe('convert some attachments: someToExternalFormat', () => {
    const useCasesSomeAttachments: ConvertAttachmentsToBackendTestArgs[] = [
      {
        includeAllAttachments: false,
        includePdf: true,
        onlyCurrentTask: true,
        selectedAttachments: ['attachment1'],
        expected: ['attachment1', reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: false,
        includePdf: true,
        onlyCurrentTask: false,
        selectedAttachments: ['attachment1'],
        expected: ['attachment1', reservedDataTypes.refDataAsPdf],
      },
      {
        includeAllAttachments: false,
        includePdf: false,
        onlyCurrentTask: true,
        selectedAttachments: ['attachment1'],
        expected: ['attachment1', reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: false,
        includePdf: false,
        onlyCurrentTask: false,
        selectedAttachments: ['attachment1'],
        expected: ['attachment1'],
      },
    ];

    useCasesSomeAttachments.forEach((useCase, index) => {
      it(`should convert some attachments to backend with ${useCasesDesc[index]}`, () => {
        expect(attachmentsToExternalFormat(useCase)).toEqual(useCase.expected);
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
      it(`should convert to correct internal format when all attachments and ${useCasesDesc[index]} `, () => {
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
