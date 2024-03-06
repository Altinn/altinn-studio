import { convertAttachmentsToBackend, reservedDataTypes } from './AttachmentListUtils';

describe('Convert to external format', () => {
  const useCasesDesc = ['current task and pdf', 'all tasks and pdf', 'current task', 'all tasks'];

  describe('convert all attachments', () => {
    const useCasesAllAttachments = [
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
        expect(convertAttachmentsToBackend(useCase)).toEqual(useCase.expected);
      });
    });
  });

  describe('convert some attachments', () => {
    const useCasesSomeAttachments = [
      {
        includeAllAttachments: false,
        includePdf: true,
        onlyCurrentTask: true,
        selectedAttachments: [],
        expected: [reservedDataTypes.refDataAsPdf, reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: false,
        includePdf: true,
        onlyCurrentTask: false,
        selectedAttachments: [],
        expected: [reservedDataTypes.refDataAsPdf],
      },
      {
        includeAllAttachments: false,
        includePdf: false,
        onlyCurrentTask: true,
        selectedAttachments: [],
        expected: [reservedDataTypes.currentTask],
      },
      {
        includeAllAttachments: false,
        includePdf: false,
        onlyCurrentTask: false,
        selectedAttachments: [],
        expected: [],
      },
    ];

    useCasesSomeAttachments.forEach((useCase, index) => {
      it(`should convert some attachments to backend with ${useCasesDesc[index]}`, () => {
        expect(convertAttachmentsToBackend(useCase)).toEqual(useCase.expected);
      });
    });
  });
});
