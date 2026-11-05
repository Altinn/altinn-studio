import React, { useEffect } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { vi } from 'vitest';
import type { JSONSchema7 } from 'json-schema';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { useQueryClient } from 'src/core/queries/reactQuery';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useIsSubformPage } from 'src/hooks/navigation';
import { ApiError } from 'src/layout/BrokerFileTransfer/brokerClient/client';
import { getFileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import { getResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import { checkInterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';
import { createUploadController } from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import { BrokerFileTransferComponent } from 'src/layout/BrokerFileTransfer/BrokerFileTransferComponent';
import { GenericComponent } from 'src/layout/GenericComponent';
import { renderGenericComponentTest, renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { QueryClient } from 'src/core/queries/reactQuery';
import type { ResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import type { UploadPlan, UploadProgress } from 'src/layout/BrokerFileTransfer/brokerClient/tus/tusUpload';
import type {
  ActiveUpload,
  TransferRecord,
  UploadController,
} from 'src/layout/BrokerFileTransfer/brokerClient/upload/uploadController';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

vi.mock('src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration')>()),
  getResourceConfiguration: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus')>()),
  getFileTransferOverview: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer')>()),
  checkInterruptedTransfer: vi.fn(),
}));
vi.mock('src/layout/BrokerFileTransfer/brokerClient/upload/uploadController', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/layout/BrokerFileTransfer/brokerClient/upload/uploadController')>()),
  createUploadController: vi.fn(),
}));
vi.mock('src/hooks/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/hooks/navigation')>()),
  useIsSubformPage: vi.fn(),
}));

const ORGANIZATION = '912345678';
const RECIPIENT = '991825827';
const INSTANCE_ID = '512345/75154373-aed4-41f7-95b4-e5b5115c2edc';

const transfer = {
  resourceId: 'broker-resource',
  sender: ORGANIZATION,
  fileTransferId: 'transfer-1',
  fileName: 'rapport.pdf',
};
const plan: UploadPlan = { fileTransferId: 'transfer-1', parts: [{ path: '/tus/transfer-1', start: 0, length: 9 }] };
const resumable = { status: 'resumable', fileName: 'rapport.pdf', plan, uploaded: 3 } as const;
const interruptedFormData = { id: 'transfer-1', status: 'Initialized', name: 'rapport.pdf' };
const interruptedText =
  'Opplastingen av «rapport.pdf» ble avbrutt. Velg den samme filen for å fortsette der den stoppet.';

const binding = (field: string) => ({ dataType: defaultDataTypeMock, field });

const resourceConfiguration: ResourceConfiguration = {
  maxFileTransferSize: null,
  fileTransferTimeToLive: '30.00:00:00',
  purgeFileTransferAfterAllRecipientsConfirmed: true,
  purgeFileTransferGracePeriod: '02:00:00',
  requiredParty: null,
  approvedForDisabledVirusScan: false,
};

function fakeController() {
  const listeners = new Set<() => void>();
  let state: { active: ActiveUpload | null; progress: UploadProgress | null; transfer: TransferRecord | null } = {
    active: null,
    progress: null,
    transfer: null,
  };
  const controller: UploadController = {
    start: vi.fn(async () => undefined),
    continueTransfer: vi.fn(async () => undefined),
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    discard: vi.fn((given) => update({ transfer: { ...given, status: null } })),
    markReceived: vi.fn((given, status) => update({ transfer: { ...given, status } })),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getActive: () => state.active,
    getProgress: () => state.progress,
    getTransfer: () => state.transfer,
  };
  const update = (changes: Partial<typeof state>) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  };
  return { controller, update };
}

// Uploads are kept per component across renders, so each test uses its own component id
let componentCount = 0;

const findFileInput = () => screen.findByLabelText(/Last opp rapporten/, { selector: 'input' });

// For text that translations split across elements
const findWholeText = (text: string) =>
  screen.findByText((_, element) => element?.tagName === 'SPAN' && element.textContent === text);

// Lets a test refresh the component's queries, as coming back to the page later would
let queryClient: QueryClient;
function CaptureQueryClient() {
  const client = useQueryClient();
  useEffect(() => {
    queryClient = client;
  }, [client]);
  return null;
}

async function render({
  owner = ORGANIZATION,
  formData = { id: '', status: '', name: '' },
  schema,
  ...component
}: { owner?: string | null; formData?: Record<string, string>; schema?: JSONSchema7 } & Partial<
  RenderGenericComponentTestProps<'BrokerFileTransfer'>['component']
> = {}) {
  componentCount += 1;
  return renderGenericComponentTest({
    type: 'BrokerFileTransfer',
    renderer: (props) => (
      <>
        <CaptureQueryClient />
        <BrokerFileTransferComponent {...props} />
      </>
    ),
    component: {
      id: `broker-file-transfer-${componentCount}`,
      resourceId: 'broker-resource',
      hasCustomRecipients: true,
      recipients: RECIPIENT,
      dataModelBindings: {
        fileTransferId: { dataType: defaultDataTypeMock, field: 'broker.id' },
        fileTransferStatus: { dataType: defaultDataTypeMock, field: 'broker.status' },
        fileName: { dataType: defaultDataTypeMock, field: 'broker.name' },
        checksum: { dataType: defaultDataTypeMock, field: 'broker.checksum' },
      },
      textResourceBindings: { title: 'Last opp rapporten' },
      ...component,
    },
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.dataModels[defaultDataTypeMock].initialData = { broker: formData };
          if (schema) {
            bootstrap.dataModels[defaultDataTypeMock].schema = schema;
          }
        }),
    },
    apis: {
      instanceApi: {
        getInstance: async () => ({
          ...getInstanceDataMock(undefined, 512345, owner ? undefined : '01017512345', owner),
          process: getProcessDataMock(),
        }),
      },
    },
  });
}

describe('BrokerFileTransferComponent', () => {
  let fake: ReturnType<typeof fakeController>;

  beforeEach(() => {
    window.altinnAppGlobalData.platformFrontendSettings.brokerApiBaseUrl = 'https://platform.tt02.altinn.no';
    fake = fakeController();
    vi.mocked(createUploadController).mockReturnValue(fake.controller);
    vi.mocked(getResourceConfiguration).mockResolvedValue(resourceConfiguration);
    vi.mocked(getFileTransferOverview).mockRejectedValue(new ApiError('Not found', 404));
    vi.mocked(useIsSubformPage).mockReturnValue(false);
  });

  describe('setup', () => {
    it('refuses to be used in a repeating group, where deleting a row would move uploads to another row', async () => {
      await renderInRepeatingGroup();

      expect(await screen.findByText('BrokerFileTransfer cannot be used in a repeating group.')).toBeInTheDocument();
      expect(createUploadController).not.toHaveBeenCalled();
    });

    it('refuses to be used in a subform, like the file upload component', async () => {
      vi.mocked(useIsSubformPage).mockReturnValue(true);
      await render();

      expect(await screen.findByText('BrokerFileTransfer cannot be used in a subform.')).toBeInTheDocument();
      expect(createUploadController).not.toHaveBeenCalled();
    });

    it('only sends on behalf of an organization', async () => {
      await render({ owner: null });

      expect(await screen.findByText('Du kan bare sende denne filen på vegne av en virksomhet.')).toBeInTheDocument();
    });

    it('asks the user to log in again when Broker does not accept the login', async () => {
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
      vi.mocked(getResourceConfiguration).mockRejectedValue(new ApiError('Request failed: 401', 401, ''));
      await render();

      expect(
        await screen.findByText(
          'Altinn Formidling godtok ikke innloggingen din. Last inn siden på nytt for å logge inn igjen.',
        ),
      ).toBeInTheDocument();
      logError.mockRestore();
    });

    it("reports Broker's reason as a configuration error when Broker refuses the resource", async () => {
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
      vi.mocked(getResourceConfiguration).mockRejectedValue(
        new ApiError('Request failed: 403', 403, { errorCode: 5, detail: 'The resource needs to be registered' }),
      );
      await render();

      expect(
        await screen.findByText(/cannot send on the resource 'broker-resource': The resource needs to be registered/),
      ).toBeInTheDocument();
      logError.mockRestore();
    });

    it('suggests reloading when the settings cannot be read for another reason', async () => {
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
      vi.mocked(getResourceConfiguration).mockRejectedValue(new ApiError('Request failed: 503', 503));
      await render();

      expect(
        await screen.findByText(
          'Vi fikk ikke hentet innstillingene for å sende filen. Prøv å laste inn siden på nytt.',
        ),
      ).toBeInTheDocument();
      logError.mockRestore();
    });

    it('reports a configuration error when there is more metadata than Broker allows', async () => {
      await render({
        metadata: Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`name${index}`, 'value'])),
      });

      expect(await screen.findByText('metadata kan ha høyst 10 oppføringer, men har 11.')).toBeInTheDocument();
    });

    it('reports a configuration error when a metadata key is longer than Broker allows', async () => {
      await render({ metadata: { ['n'.repeat(51)]: 'value' } });

      expect(await screen.findByText(/Disse nøklene i metadata er tomme eller lengre enn 50 tegn/)).toBeInTheDocument();
    });

    it('reports a configuration error when the resource is not approved for sending without virus scan', async () => {
      await render({ disableVirusScan: true });

      expect(await screen.findByText(/not approved for sending without virus scan/)).toBeInTheDocument();
    });

    it('reports a configuration error when recipients are specified but left empty', async () => {
      await render({ recipients: '' });

      expect(
        await screen.findByText('hasCustomRecipients er satt, men recipients inneholder ingen organisasjonsnummer.'),
      ).toBeInTheDocument();
    });
  });

  describe('where the app cannot reach Broker', () => {
    it('looks as usual but cannot send where the app cannot reach Broker', async () => {
      window.altinnAppGlobalData.platformFrontendSettings.brokerApiBaseUrl = undefined;
      await render({ owner: null });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      expect(screen.getByText('rapport.pdf')).toBeInTheDocument();
      expect(screen.getByText('Det er ikke mulig å sende filer med Altinn Formidling her.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
      expect(createUploadController).not.toHaveBeenCalled();
    });

    it('checks the file against the size limit it knows where the app cannot reach Broker', async () => {
      window.altinnAppGlobalData.platformFrontendSettings.brokerApiBaseUrl = undefined;
      await render({ maxFileTransferSizeInMB: 2 });

      expect(await screen.findByText('Maks filstørrelse 2 MB')).toBeInTheDocument();
      await userEvent.upload(await findFileInput(), new File([new Uint8Array(2_500_000)], 'rapport.pdf'));

      expect(screen.getByText('Filen er 2,5 MB. Du kan sende filer på opptil 2 MB.')).toBeInTheDocument();
    });

    it('reports configuration errors where the app cannot reach Broker', async () => {
      window.altinnAppGlobalData.platformFrontendSettings.brokerApiBaseUrl = undefined;
      await render({ resourceId: '' });

      expect(
        await screen.findByText('resourceId må angi ressursen i Altinn Formidling som filen skal sendes på.'),
      ).toBeInTheDocument();
    });
  });

  describe('choosing a file', () => {
    it('refuses a file larger than the resource allows', async () => {
      vi.mocked(getResourceConfiguration).mockResolvedValue({ ...resourceConfiguration, maxFileTransferSize: 5 });
      await render();

      await userEvent.upload(await findFileInput(), new File(['too large'], 'rapport.pdf'));

      expect(screen.getByText('Filen er 9 B. Du kan sende filer på opptil 5 B.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });

    it("uses the component's size limit when it is lower than the resource's", async () => {
      await render({ maxFileTransferSizeInMB: 1 });

      await userEvent.upload(await findFileInput(), new File([new Uint8Array(2_500_000)], 'rapport.pdf'));

      expect(screen.getByText('Filen er 2,5 MB. Du kan sende filer på opptil 1 MB.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });

    it("keeps the resource's size limit when it is lower than the component's", async () => {
      vi.mocked(getResourceConfiguration).mockResolvedValue({ ...resourceConfiguration, maxFileTransferSize: 5 });
      await render({ maxFileTransferSizeInMB: 1 });

      await userEvent.upload(await findFileInput(), new File(['too large'], 'rapport.pdf'));

      expect(screen.getByText('Filen er 9 B. Du kan sende filer på opptil 5 B.')).toBeInTheDocument();
    });

    it('shows which file types are allowed', async () => {
      await render({ hasCustomFileEndings: true, validFileEndings: '.pdf,.docx' });

      expect(await findWholeText('Tillatte filformater er: .pdf, .docx')).toBeInTheDocument();
    });

    it('allows all file types unless the component limits them', async () => {
      await render({ validFileEndings: '.pdf' });

      expect(await findWholeText('Tillatte filformater er: alle')).toBeInTheDocument();
    });

    it('refuses a file type that is not allowed, until the file is removed', async () => {
      const user = userEvent.setup({ applyAccept: false });
      await render({ hasCustomFileEndings: true, validFileEndings: '.pdf' });

      await user.upload(await findFileInput(), new File(['content'], 'rapport.txt', { type: 'text/plain' }));

      expect(screen.getByText('Du kan bare sende disse filtypene: .pdf.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();

      await user.click(screen.getByRole('button', { name: 'Fjern' }));

      expect(screen.queryByText('Du kan bare sende disse filtypene: .pdf.')).not.toBeInTheDocument();
    });

    it('sends a file of an allowed type', async () => {
      await render({ hasCustomFileEndings: true, validFileEndings: '.pdf' });
      const file = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });

      await userEvent.upload(await findFileInput(), file);
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(expect.objectContaining({ file }));
    });

    it('shows that one file can be sent, like the file upload component does', async () => {
      await render();

      expect(await screen.findByText('Antall filer 0/1.')).toBeInTheDocument();
    });

    it('asks to choose a file instead of dragging one on phones and tablets', async () => {
      const { innerWidth } = window;
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 600 });
      try {
        await render();

        expect(await screen.findByText('Velg fil')).toBeInTheDocument();
        expect(screen.queryByText(/Dra og slipp/)).not.toBeInTheDocument();
      } finally {
        Object.defineProperty(window, 'innerWidth', { configurable: true, value: innerWidth });
      }
    });

    it('keeps the chosen file when the user leaves the page and comes back', async () => {
      const { unmount } = await render({ id: 'broker-file-transfer-revisited' });
      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      unmount();

      await render({ id: 'broker-file-transfer-revisited' });

      expect(await screen.findByText('rapport.pdf')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeEnabled();
    });

    it('keeps the problem with a chosen file when the user comes back', async () => {
      const user = userEvent.setup({ applyAccept: false });
      const component = { id: 'broker-file-transfer-wrong-type', hasCustomFileEndings: true, validFileEndings: '.pdf' };
      const { unmount } = await render(component);
      await user.upload(await findFileInput(), new File(['content'], 'rapport.txt', { type: 'text/plain' }));
      unmount();

      await render(component);

      expect(await screen.findByText('Du kan bare sende disse filtypene: .pdf.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });
  });

  describe('sending', () => {
    it('sends the chosen file to the configured recipients, with the instance as reference', async () => {
      await render();
      const file = new File(['content'], 'rapport.pdf', { type: 'application/pdf' });

      await userEvent.upload(await findFileInput(), file);
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith({
        resourceId: 'broker-resource',
        sender: ORGANIZATION,
        recipients: [RECIPIENT],
        file,
        reference: INSTANCE_ID,
        disableVirusScan: false,
        propertyList: {},
      });
    });

    it('sends the metadata with the file, leaving out entries without a value', async () => {
      await render({
        formData: { id: '', status: '', name: '', case: '2024/17' },
        metadata: {
          caseNumber: ['dataModel', 'broker.case'],
          category: 'invoice',
          comment: ['dataModel', 'broker.comment'],
        },
      });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(
        expect.objectContaining({ propertyList: { caseNumber: '2024/17', category: 'invoice' } }),
      );
    });

    it.each([
      ['an empty required metadata field blocks sending', '', true],
      ['a filled required metadata field lets the file be sent', '2024/17', false],
    ])('%s', async (_, caseNumber, blocked) => {
      await render({
        formData: { id: '', status: '', name: '', case: caseNumber },
        metadata: { caseNumber: ['dataModel', 'broker.case'] },
        schema: {
          type: 'object',
          properties: {
            broker: { type: 'object', properties: { case: { type: 'string' } }, required: ['case'] },
          },
        },
      });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      const message = screen.queryByText('Fyll ut de påkrevde feltene før du sender filen.');
      expect(message !== null).toBe(blocked);
      expect(screen.getByRole('button', { name: 'Send filen' })).toHaveProperty('disabled', blocked);
    });

    it('sends without virus scan when the resource is approved for it', async () => {
      vi.mocked(getResourceConfiguration).mockResolvedValue({
        ...resourceConfiguration,
        approvedForDisabledVirusScan: true,
      });
      await render({ disableVirusScan: true });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(expect.objectContaining({ disableVirusScan: true }));
    });

    it('sends to the required party of the resource unless recipients are specified', async () => {
      vi.mocked(getResourceConfiguration).mockResolvedValue({
        ...resourceConfiguration,
        requiredParty: 'urn:altinn:organization:identifier-no:987654321',
      });
      await render({ hasCustomRecipients: false });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(expect.objectContaining({ recipients: ['987654321'] }));
    });

    it('sends to every recipient in the comma-separated list', async () => {
      await render({ recipients: `${RECIPIENT}, 974760673` });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(
        expect.objectContaining({ recipients: [RECIPIENT, '974760673'] }),
      );
    });

    it('sends to the organizations in a data model field', async () => {
      await render({
        formData: { id: '', status: '', name: '', recipients: `${RECIPIENT}, 974760673` },
        recipients: ['dataModel', 'broker.recipients'],
      });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(
        expect.objectContaining({ recipients: [RECIPIENT, '974760673'] }),
      );
    });

    it('asks the user for the recipients when the data model field is empty', async () => {
      await render({ recipients: ['dataModel', 'broker.recipients'] });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      expect(screen.getByText('Du må oppgi hvem som skal motta filen, før du kan sende den.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });

    it('tells the user which recipients in the data model field are not organization numbers', async () => {
      await render({
        formData: { id: '', status: '', name: '', recipients: `${RECIPIENT}, 12345` },
        recipients: ['dataModel', 'broker.recipients'],
      });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      expect(
        screen.getByText('Filen kan bare sendes til organisasjonsnummer med ni siffer, ikke til 12345.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });

    it('sends the checksum from the data model in lower case', async () => {
      const checksum = 'D41D8CD98F00B204E9800998ECF8427E';
      await render({ formData: { id: '', status: '', name: '', checksum } });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(expect.objectContaining({ checksum: checksum.toLowerCase() }));
    });

    it('sends without a checksum when the data model leaves it out', async () => {
      await render();

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      await userEvent.click(screen.getByRole('button', { name: 'Send filen' }));

      expect(fake.controller.start).toHaveBeenCalledWith(expect.objectContaining({ checksum: undefined }));
    });

    it('asks for the checksum when the data model requires it', async () => {
      await render({
        schema: {
          type: 'object',
          properties: {
            broker: {
              type: 'object',
              properties: { checksum: { type: 'string' } },
              required: ['checksum'],
            },
          },
        },
      });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      expect(screen.getByText('Du må fylle ut sjekksum')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });

    it('refuses a checksum that is neither MD5 nor SHA256', async () => {
      await render({ formData: { id: '', status: '', name: '', checksum: 'abc123' } });

      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));

      expect(
        screen.getByText('Sjekksummen må være 32 eller 64 tegn, med bare tallene 0–9 og bokstavene a–f.'),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Send filen' })).toBeDisabled();
    });
  });

  describe('uploading', () => {
    it.each(['Initialized', 'UploadProcessing'])(
      'records the file transfer and its status (%s) in the data model',
      async (status) => {
        const { formDataMethods } = await render();
        await findFileInput();

        fake.update({ transfer: { ...transfer, status } });

        await waitFor(() =>
          expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith(
            expect.objectContaining({
              changes: [
                expect.objectContaining({ reference: binding('broker.id'), newValue: 'transfer-1' }),
                expect.objectContaining({ reference: binding('broker.status'), newValue: status }),
                expect.objectContaining({ reference: binding('broker.name'), newValue: 'rapport.pdf' }),
              ],
            }),
          ),
        );
      },
    );

    it('shows the upload speed and the time left', async () => {
      await render();
      await findFileInput();

      fake.update({
        active: {
          resourceId: 'broker-resource',
          sender: ORGANIZATION,
          fileName: 'rapport.pdf',
          fileSize: 2_000_000_000,
          status: 'uploading',
          error: null,
        },
        progress: {
          loaded: 1_000_000_000,
          total: 2_000_000_000,
          percent: 50,
          bytesPerSecond: 25_000_000,
          secondsRemaining: 180,
        },
      });

      expect(await screen.findByText(/25 MB\/s · 3 minutter igjen/)).toBeInTheDocument();
    });

    it('shows how far the upload has got, and pauses it', async () => {
      await render();
      await findFileInput();

      fake.update({
        active: {
          resourceId: 'broker-resource',
          sender: ORGANIZATION,
          fileName: 'rapport.pdf',
          fileSize: 2000,
          status: 'uploading',
          error: null,
        },
        progress: { loaded: 1000, total: 2000, percent: 50, bytesPerSecond: null, secondsRemaining: null },
      });

      expect(await screen.findByText(/Laster opp – 50 %/)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Pause' }));
      expect(fake.controller.pause).toHaveBeenCalled();
    });

    it('keeps showing the upload when reading the settings again fails', async () => {
      await render();
      await findFileInput();
      fake.update({
        active: {
          resourceId: 'broker-resource',
          sender: ORGANIZATION,
          fileName: 'rapport.pdf',
          fileSize: 2000,
          status: 'uploading',
          error: null,
        },
        progress: { loaded: 1000, total: 2000, percent: 50, bytesPerSecond: null, secondsRemaining: null },
      });
      expect(await screen.findByText(/Laster opp – 50 %/)).toBeInTheDocument();

      const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
      vi.mocked(getResourceConfiguration).mockRejectedValue(new ApiError('Request failed: 503', 503));
      await queryClient.refetchQueries({ queryKey: ['brokerFileTransfer', 'resourceConfiguration'] });

      // The component logs the failure once it has rendered with it
      await waitFor(() => expect(logError).toHaveBeenCalled());
      expect(screen.getByText(/Laster opp – 50 %/)).toBeInTheDocument();
      expect(fake.controller.pause).not.toHaveBeenCalled();
      logError.mockRestore();
    });

    it('clears the data model when the file transfer is given up', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      const { formDataMethods } = await render({ formData: interruptedFormData });
      await screen.findByText(interruptedText);

      fake.update({ transfer: { ...transfer, status: null } });

      await waitFor(() =>
        expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith(
          expect.objectContaining({
            changes: [
              expect.objectContaining({ reference: binding('broker.id'), newValue: undefined }),
              expect.objectContaining({ reference: binding('broker.status'), newValue: undefined }),
              expect.objectContaining({ reference: binding('broker.name'), newValue: undefined }),
            ],
          }),
        ),
      );
    });
  });

  describe('a sent file', () => {
    it('shows a file that has been sent', async () => {
      await render({ formData: { id: 'transfer-1', status: 'Published', name: 'rapport.pdf' } });

      expect(await screen.findByText('rapport.pdf')).toBeInTheDocument();
      expect(screen.getByText('Sendt')).toBeInTheDocument();
      expect(screen.getByText('Formidlings-ID: transfer-1')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send filen' })).not.toBeInTheDocument();
    });

    it('shows the size and checksum Broker has for the sent file', async () => {
      vi.mocked(getFileTransferOverview).mockResolvedValue({
        fileTransferStatus: 'Published',
        fileName: 'rapport.pdf',
        fileTransferSize: 2_500_000,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        checksumAlgorithm: 'SHA256',
      });
      await render({ formData: { id: 'transfer-1', status: 'Published', name: 'rapport.pdf' } });

      expect(await screen.findByText(/2,5.MB/)).toBeInTheDocument();
      expect(screen.getByText(/Sjekksum \(SHA256\): e3b0c44298fc1c149afbf4c8996fb924/)).toBeInTheDocument();
    });

    it.each(['UploadProcessing', 'UploadStarted'])(
      'shows the file as being checked while Broker reports it as %s',
      async (fileTransferStatus) => {
        vi.mocked(getFileTransferOverview).mockResolvedValue({
          fileTransferStatus,
          fileName: 'rapport.pdf',
          fileTransferSize: 2_500_000,
        });
        const { formDataMethods } = await render({
          formData: { id: 'transfer-1', status: 'UploadProcessing', name: 'rapport.pdf' },
        });

        expect(await screen.findByText(/2,5.MB/)).toBeInTheDocument();
        expect(screen.getByText('Kontrolleres')).toBeInTheDocument();
        expect(screen.queryByText('Sendt')).not.toBeInTheDocument();
        expect(formDataMethods.setMultiLeafValues).not.toHaveBeenCalled();
      },
    );

    it('records the status once Broker has published the file', async () => {
      vi.mocked(getFileTransferOverview).mockResolvedValue({
        fileTransferStatus: 'Published',
        fileName: 'rapport.pdf',
      });
      const { formDataMethods } = await render({
        formData: { id: 'transfer-1', status: 'UploadProcessing', name: 'rapport.pdf' },
      });

      await waitFor(() =>
        expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith(
          expect.objectContaining({
            changes: [expect.objectContaining({ reference: binding('broker.status'), newValue: 'Published' })],
          }),
        ),
      );
    });

    it('lets go of the chosen file and the upload once the file is sent', async () => {
      const { unmount } = await render({ id: 'broker-file-transfer-sent' });
      await userEvent.upload(await findFileInput(), new File(['content'], 'rapport.pdf'));
      fake.update({ transfer: { ...transfer, status: 'UploadProcessing' } });
      expect(await screen.findByText('Kontrolleres')).toBeInTheDocument();
      unmount();

      vi.mocked(createUploadController).mockReturnValue(fakeController().controller);
      await render({ id: 'broker-file-transfer-sent' });

      expect(await findFileInput()).toBeInTheDocument();
      expect(screen.queryByText('rapport.pdf')).not.toBeInTheDocument();
      expect(createUploadController).toHaveBeenCalledTimes(2);
    });
  });

  describe('an interrupted upload', () => {
    it('continues an interrupted upload to the recipients it was started with', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      await render({ formData: interruptedFormData, recipients: ['dataModel', 'broker.recipients'] });

      await userEvent.upload(await findFileInput(), new File(['rapporten'], 'rapport.pdf'));

      expect(
        screen.queryByText('Du må oppgi hvem som skal motta filen, før du kan sende den.'),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fortsett opplastingen' })).toBeEnabled();
    });

    it('continues an interrupted upload with the checksum it was started with', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      await render({ formData: { ...interruptedFormData, checksum: 'abc123' } });

      await userEvent.upload(await findFileInput(), new File(['rapporten'], 'rapport.pdf'));

      expect(screen.queryByText(/^Sjekksummen må være/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fortsett opplastingen' })).toBeEnabled();
    });

    it('continues an interrupted upload where it stopped when the same file is chosen', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      await render({ formData: interruptedFormData });

      expect(await screen.findByText(interruptedText)).toBeInTheDocument();
      expect(screen.getByText('33 % er allerede lastet opp og sendes ikke på nytt.')).toBeInTheDocument();
      const file = new File(['rapporten'], 'rapport.pdf');
      await userEvent.upload(await findFileInput(), file);
      await userEvent.click(screen.getByRole('button', { name: 'Fortsett opplastingen' }));

      expect(fake.controller.continueTransfer).toHaveBeenCalledWith({
        resourceId: 'broker-resource',
        sender: ORGANIZATION,
        fileTransferId: 'transfer-1',
        file,
        plan,
        uploaded: 3,
      });
    });

    it('refuses another file than the one the interrupted upload was sending', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      await render({ formData: interruptedFormData });

      await userEvent.upload(await findFileInput(), new File(['rapporten'], 'annen.pdf'));

      expect(
        screen.getByText(
          'Dette er ikke filen som ble lastet opp. Velg «rapport.pdf», eller forkast den avbrutte opplastingen for å sende en annen fil.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fortsett opplastingen' })).toBeDisabled();
    });

    it('discards an interrupted upload', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue(resumable);
      await render({ formData: interruptedFormData });

      await userEvent.click(await screen.findByRole('button', { name: 'Forkast opplastingen' }));
      await userEvent.click(screen.getByRole('button', { name: 'Ja, forkast' }));

      expect(fake.controller.discard).toHaveBeenCalledWith(transfer, plan);
    });

    it('records an interrupted file transfer that Broker has received meanwhile', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue({
        status: 'received',
        fileName: 'rapport.pdf',
        fileTransferStatus: 'Published',
      });
      await render({ formData: interruptedFormData });

      await waitFor(() => expect(fake.controller.markReceived).toHaveBeenCalledWith(transfer, 'Published'));
    });

    it('gives up an interrupted file transfer that Broker no longer has', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue({ status: 'gone' });
      await render({ formData: interruptedFormData });

      await waitFor(() => expect(fake.controller.discard).toHaveBeenCalledWith(transfer, null));
    });

    it('gives up a file transfer Broker has failed, and says why', async () => {
      vi.mocked(checkInterruptedTransfer).mockResolvedValue({ status: 'failed', failure: 'virus' });
      await render({ formData: { id: 'transfer-1', status: 'Failed', name: 'rapport.pdf' } });

      await waitFor(() => expect(fake.controller.discard).toHaveBeenCalledWith(transfer, null));
      fake.update({ transfer: { ...transfer, status: null } });

      expect(
        await screen.findByText('Altinn Formidling fant skadelig innhold i filen og avviste den. Velg en annen fil.'),
      ).toBeInTheDocument();
      expect(await findFileInput()).toBeInTheDocument();
    });

    it('says so when it cannot check an interrupted upload', async () => {
      const logError = vi.spyOn(window, 'logError').mockImplementation(() => undefined);
      const error = new Error('Broker is down');
      vi.mocked(checkInterruptedTransfer).mockRejectedValue(error);
      await render({ formData: interruptedFormData });

      expect(
        await screen.findByText(
          'Vi fikk ikke sjekket hvor langt den avbrutte opplastingen kom. Prøv å laste inn siden på nytt.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Send filen' })).not.toBeInTheDocument();
      expect(logError).toHaveBeenCalledWith(expect.any(String), error);
      logError.mockRestore();

      await userEvent.click(screen.getByRole('button', { name: 'Forkast opplastingen' }));
      await userEvent.click(screen.getByRole('button', { name: 'Ja, forkast' }));
      expect(fake.controller.discard).toHaveBeenCalledWith(transfer, null);
    });
  });
});

async function renderInRepeatingGroup() {
  return renderWithInstanceAndLayout({
    renderer: <GenericComponent baseComponentId='broker-rows' />,
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.layouts = {
            FormLayout: {
              data: {
                layout: [
                  {
                    id: 'broker-rows',
                    type: 'RepeatingGroup',
                    dataModelBindings: { group: binding('rows') },
                    children: ['broker-in-row'],
                    edit: { mode: 'showAll' },
                  },
                  {
                    id: 'broker-in-row',
                    type: 'BrokerFileTransfer',
                    resourceId: 'broker-resource',
                    dataModelBindings: {
                      fileTransferId: binding('rows.id'),
                      fileTransferStatus: binding('rows.status'),
                    },
                  },
                ],
              },
            },
          };
          bootstrap.dataModels[defaultDataTypeMock].initialData = { rows: [{ [ALTINN_ROW_ID]: 'row-1' }] };
        }),
    },
  });
}
