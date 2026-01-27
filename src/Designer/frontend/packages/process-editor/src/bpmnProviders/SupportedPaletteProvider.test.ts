import SupportedPaletteProviderModule from './SupportedPaletteProvider';

const SupportedPaletteProvider = SupportedPaletteProviderModule.supportedPaletteProvider[1] as any;

const mockAppLibVersion = '8.9.0';
const mockFrontendVersion = '4.25.2';

describe('SupportedPaletteProvider', () => {
  let provider: any;
  let mockBpmnFactory: any;
  let mockCreate: any;
  let mockElementFactory: any;
  let mockPalette: any;
  let mockTranslate: any;
  let mockModeling: any;

  beforeEach(() => {
    mockBpmnFactory = {
      create: jest.fn((type, props) => ({
        $type: type,
        ...props,
      })),
    };

    mockCreate = {
      start: jest.fn(),
    };

    mockElementFactory = {
      createShape: jest.fn((config) => ({
        type: config.type,
        businessObject: config.businessObject,
      })),
    };

    mockPalette = {
      registerProvider: jest.fn(),
    };

    mockTranslate = jest.fn((text) => text);

    mockModeling = {
      updateProperties: jest.fn(),
    };

    provider = new SupportedPaletteProvider(
      mockBpmnFactory,
      mockCreate,
      mockElementFactory,
      mockPalette,
      mockTranslate,
      mockModeling,
      mockAppLibVersion,
      mockFrontendVersion,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should register provider with palette', () => {
      expect(mockPalette.registerProvider).toHaveBeenCalledWith(provider);
    });

    it('should store dependencies', () => {
      expect(provider.bpmnFactory).toBe(mockBpmnFactory);
      expect(provider.create).toBe(mockCreate);
      expect(provider.elementFactory).toBe(mockElementFactory);
      expect(provider.translate).toBe(mockTranslate);
      expect(provider.modeling).toBe(mockModeling);
      expect(provider.appLibVersion).toBe(mockAppLibVersion);
      expect(provider.frontendVersion).toBe(mockFrontendVersion);
    });
  });

  describe('getPaletteEntries', () => {
    it('should return custom entries including PDF service task', () => {
      const mockEntries = {
        'create.task': {},
        'create.subprocess-expanded': {},
      };

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      expect(result['create.altinn-pdf-task']).toBeDefined();
      expect(result['create.altinn-pdf-task'].group).toBe('activity');
      expect(result['create.altinn-pdf-task'].className).toBe(
        'bpmn-icon-task-generic bpmn-icon-pdf-task',
      );
      expect(result['create.altinn-pdf-task'].title).toBe(
        'process_editor.palette_create_pdf_service_task',
      );
      expect(result['create.altinn-pdf-task'].action.click).toBeDefined();
      expect(result['create.altinn-pdf-task'].action.dragstart).toBeDefined();
    });

    it('should remove unsupported entries from palette', () => {
      const mockEntries = {
        'create.task': {},
        'create.subprocess-expanded': {},
        'create.exclusive-gateway': {},
      };

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      expect(result['create.task']).toBeUndefined();
      expect(result['create.subprocess-expanded']).toBeUndefined();
      expect(result['create.exclusive-gateway']).toBeDefined();
    });

    it('should include all custom Altinn task types', () => {
      const mockEntries = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      expect(result['create.altinn-data-task']).toBeDefined();
      expect(result['create.altinn-feedback-task']).toBeDefined();
      expect(result['create.altinn-signing-task']).toBeDefined();
      expect(result['create.altinn-user-controlled-signing-task']).toBeDefined();
      expect(result['create.altinn-confirmation-task']).toBeDefined();
      expect(result['create.altinn-payment-task']).toBeDefined();
      expect(result['create.altinn-pdf-task']).toBeDefined();
    });
  });

  describe('PDF service task creation', () => {
    it('should create ServiceTask with pdf taskType', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockBpmnFactory.create).toHaveBeenCalledWith('bpmn:ServiceTask', {
        name: 'Altinn pdf task',
      });
    });

    it('should create shape with ServiceTask type', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockElementFactory.createShape).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'bpmn:ServiceTask',
        }),
      );
    });

    it('should create TaskExtension with pdf taskType and PdfConfig', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockBpmnFactory.create).toHaveBeenCalledWith('altinn:TaskExtension', {
        taskType: 'pdf',
        pdfConfig: expect.objectContaining({
          $type: 'altinn:PdfConfig',
        }),
      });
    });

    it('should create PdfConfig', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockBpmnFactory.create).toHaveBeenCalledWith('altinn:PdfConfig');
    });

    it('should update properties with extension elements', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockModeling.updateProperties).toHaveBeenCalled();
      const updateCall = mockModeling.updateProperties.mock.calls[0];
      expect(updateCall[1].extensionElements).toBeDefined();
      expect(updateCall[1].extensionElements.$type).toBe('bpmn:ExtensionElements');
    });

    it('should start creation with task and event', () => {
      const mockEntries = {};
      const mockEvent = { x: 100, y: 200 };

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.click(mockEvent);

      expect(mockCreate.start).toHaveBeenCalledWith(mockEvent, expect.any(Object));
    });

    it('should handle dragstart action for PDF service task', () => {
      const mockEntries = {};
      const mockEvent = { x: 150, y: 250 };

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-pdf-task'].action.dragstart(mockEvent);

      expect(mockCreate.start).toHaveBeenCalledWith(mockEvent, expect.any(Object));
    });
  });

  describe('_deleteUnsupportedEntries', () => {
    it('should delete entries that are not in supportedEntries list', () => {
      const entries = {
        'create.task': {},
        'create.subprocess-expanded': {},
        'create.exclusive-gateway': {},
        'create.start-event': {},
        'create.end-event': {},
      };

      provider._deleteUnsupportedEntries(entries);

      expect(entries['create.task']).toBeUndefined();
      expect(entries['create.subprocess-expanded']).toBeUndefined();
      expect(entries['create.exclusive-gateway']).toBeDefined();
      expect(entries['create.start-event']).toBeDefined();
      expect(entries['create.end-event']).toBeDefined();
    });
  });

  describe('_getUnsupportedEntries', () => {
    it('should return list of unsupported entries', () => {
      const entries = {
        'create.task': {},
        'create.exclusive-gateway': {},
        'create.start-event': {},
      };

      const unsupported = provider._getUnsupportedEntries(entries);

      expect(unsupported).toContain('create.task');
      expect(unsupported).not.toContain('create.exclusive-gateway');
      expect(unsupported).not.toContain('create.start-event');
    });
  });

  describe('_isUnsupportedEntry', () => {
    it('should return true for unsupported entries', () => {
      expect(provider._isUnsupportedEntry('create.task')).toBe(true);
      expect(provider._isUnsupportedEntry('create.subprocess-expanded')).toBe(true);
    });

    it('should return false for supported entries', () => {
      expect(provider._isUnsupportedEntry('create.exclusive-gateway')).toBe(false);
      expect(provider._isUnsupportedEntry('create.start-event')).toBe(false);
      expect(provider._isUnsupportedEntry('create.end-event')).toBe(false);
    });
  });

  describe('comparison with other task types', () => {
    it('should create PDF service task as ServiceTask while other tasks are Task type', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-data-task'].action.click(mockEvent);
      const dataTaskCall = mockElementFactory.createShape.mock.calls[0];

      mockElementFactory.createShape.mockClear();

      result['create.altinn-pdf-task'].action.click(mockEvent);
      const pdfTaskCall = mockElementFactory.createShape.mock.calls[0];

      expect(dataTaskCall[0].type).toBe('bpmn:Task');
      expect(pdfTaskCall[0].type).toBe('bpmn:ServiceTask');
    });

    it('should create PDF task with PdfConfig while payment task has PaymentConfig', () => {
      const mockEntries = {};
      const mockEvent = {};

      const paletteEntries = provider.getPaletteEntries();
      const result = paletteEntries(mockEntries);

      result['create.altinn-payment-task'].action.click(mockEvent);
      const paymentConfigCalls = mockBpmnFactory.create.mock.calls.filter(
        (call) => call[0] === 'altinn:PaymentConfig',
      );

      mockBpmnFactory.create.mockClear();

      result['create.altinn-pdf-task'].action.click(mockEvent);
      const pdfConfigCalls = mockBpmnFactory.create.mock.calls.filter(
        (call) => call[0] === 'altinn:PdfConfig',
      );

      expect(paymentConfigCalls.length).toBeGreaterThan(0);
      expect(pdfConfigCalls.length).toBeGreaterThan(0);
    });
  });
});
