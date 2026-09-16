import BpmnModdle from 'bpmn-moddle';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { Moddle } from 'bpmn-js/lib/model/Types';
import {
  fromEnvironmentConfigElements,
  toEnvironmentConfigElements,
} from '../components/ConfigPanel/EnvironmentConfig/environmentConfigModdleUtils';
import { altinnCustomTasks } from './altinnCustomTasks';

const bpmnXmlWithEFormidlingConfig = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="SingleDataTask" isExecutable="false">
    <bpmn:serviceTask id="Task_eFormidling" name="eFormidling">
      <bpmn:extensionElements>
        <altinn:taskExtension>
          <altinn:taskType>eFormidling</altinn:taskType>
          <altinn:eFormidlingConfig>
            <altinn:disabled env="local">true</altinn:disabled>
            <altinn:disabled env="tt02">false</altinn:disabled>
            <altinn:receiver>991825827</altinn:receiver>
            <altinn:receiver env="production">123456789</altinn:receiver>
            <altinn:process>urn:no:difi:profile:arkivmelding:administrasjon:ver1.0</altinn:process>
            <altinn:standard>urn:no:difi:arkivmelding:xsd::arkivmelding</altinn:standard>
            <altinn:typeVersion>2.0</altinn:typeVersion>
            <altinn:type>arkivmelding</altinn:type>
            <altinn:securityLevel>3</altinn:securityLevel>
            <altinn:dpfShipmentType env="production">digital</altinn:dpfShipmentType>
            <altinn:dataTypes>
              <altinn:dataType>ref-data-as-pdf</altinn:dataType>
              <altinn:dataType>model</altinn:dataType>
            </altinn:dataTypes>
            <altinn:dataTypes env="production">
              <altinn:dataType>ref-data-as-pdf</altinn:dataType>
            </altinn:dataTypes>
          </altinn:eFormidlingConfig>
        </altinn:taskExtension>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>`;

const bpmnXmlWithGatewayExtension = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="SingleDataTask" isExecutable="false">
    <bpmn:exclusiveGateway id="Gateway_1">
      <bpmn:extensionElements>
        <altinn:gatewayExtension>
          <altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>
        </altinn:gatewayExtension>
      </bpmn:extensionElements>
    </bpmn:exclusiveGateway>
  </bpmn:process>
</bpmn:definitions>`;

const bpmnXmlWithSubformPdfConfig = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="SingleDataTask" isExecutable="false">
    <bpmn:serviceTask id="Task_subformPdf" name="Subform PDF">
      <bpmn:extensionElements>
        <altinn:taskExtension>
          <altinn:taskType>subformPdf</altinn:taskType>
          <altinn:subformPdfConfig>
            <altinn:filenameTextResourceKey>subform.pdf.filename</altinn:filenameTextResourceKey>
            <altinn:subformComponentId>SubformComponent</altinn:subformComponentId>
            <altinn:subformDataTypeId>subform-model</altinn:subformDataTypeId>
          </altinn:subformPdfConfig>
        </altinn:taskExtension>
      </bpmn:extensionElements>
    </bpmn:serviceTask>
  </bpmn:process>
</bpmn:definitions>`;

const bpmnXmlWithEnvironmentScopedCorrespondenceResource = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="SingleDataTask" isExecutable="false">
    <bpmn:task id="Task_signing" name="Signering">
      <bpmn:extensionElements>
        <altinn:taskExtension>
          <altinn:taskType>signing</altinn:taskType>
          <altinn:signatureConfig>
            <altinn:signatureDataType>signature</altinn:signatureDataType>
            <altinn:correspondenceResource>resource-global</altinn:correspondenceResource>
            <altinn:correspondenceResource env="tt02">resource-tt02</altinn:correspondenceResource>
            <altinn:correspondenceResource env="production">resource-production</altinn:correspondenceResource>
          </altinn:signatureConfig>
        </altinn:taskExtension>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>`;

/**
 * The same signing task, with an attribute the altinn moddle descriptor does not declare on the
 * environment-independent `correspondenceResource`. A hand-written file or one saved by a newer
 * schema can carry such an attribute; moddle parks it in `$attrs`. It is deliberately unprefixed,
 * because moddle drops the namespace prefix off an unknown prefixed attribute on every save.
 */
const bpmnXmlWithUndeclaredCorrespondenceResourceAttribute = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Altinn_SingleDataTask_Process_Definition" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="SingleDataTask" isExecutable="false">
    <bpmn:task id="Task_signing" name="Signering">
      <bpmn:extensionElements>
        <altinn:taskExtension>
          <altinn:taskType>signing</altinn:taskType>
          <altinn:signatureConfig>
            <altinn:correspondenceResource fallback="later-version">resource-global</altinn:correspondenceResource>
            <altinn:correspondenceResource env="tt02">resource-tt02</altinn:correspondenceResource>
          </altinn:signatureConfig>
        </altinn:taskExtension>
      </bpmn:extensionElements>
    </bpmn:task>
  </bpmn:process>
</bpmn:definitions>`;

const roundTrip = async (xml: string): Promise<string> => {
  const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
  const { rootElement, warnings } = await moddle.fromXML(xml);
  expect(warnings).toHaveLength(0);
  const { xml: savedXml } = await moddle.toXML(rootElement, { format: true });
  return savedXml;
};

describe('altinnCustomTasks', () => {
  it('preserves the eFormidlingConfig section when the BPMN is parsed and serialized again', async () => {
    const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
    const { rootElement } = await moddle.fromXML(bpmnXmlWithEFormidlingConfig);
    const { xml: savedXml } = await moddle.toXML(rootElement, { format: true });

    expect(savedXml).toMatchSnapshot();
  });
  it('preserves the gatewayExtension section when the BPMN is parsed and serialized again', async () => {
    const savedXml = await roundTrip(bpmnXmlWithGatewayExtension);

    expect(savedXml).toContain('<altinn:gatewayExtension>');
    expect(savedXml).toContain('<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>');
  });

  it('preserves the subformPdfConfig section when the BPMN is parsed and serialized again', async () => {
    const savedXml = await roundTrip(bpmnXmlWithSubformPdfConfig);

    expect(savedXml).toContain('<altinn:subformPdfConfig>');
    expect(savedXml).toContain(
      '<altinn:filenameTextResourceKey>subform.pdf.filename</altinn:filenameTextResourceKey>',
    );
    expect(savedXml).toContain(
      '<altinn:subformComponentId>SubformComponent</altinn:subformComponentId>',
    );
    expect(savedXml).toContain(
      '<altinn:subformDataTypeId>subform-model</altinn:subformDataTypeId>',
    );
  });

  it('preserves every environment-scoped correspondenceResource when the BPMN is parsed and serialized again', async () => {
    const savedXml = await roundTrip(bpmnXmlWithEnvironmentScopedCorrespondenceResource);

    expect(savedXml).toContain(
      '<altinn:correspondenceResource>resource-global</altinn:correspondenceResource>',
    );
    expect(savedXml).toContain(
      '<altinn:correspondenceResource env="tt02">resource-tt02</altinn:correspondenceResource>',
    );
    expect(savedXml).toContain(
      '<altinn:correspondenceResource env="production">resource-production</altinn:correspondenceResource>',
    );
  });

  it('reads the children of an eFormidling dataTypes element into EFormidlingDataTypes.values', async () => {
    const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
    const { rootElement, warnings } = await moddle.fromXML(bpmnXmlWithEFormidlingConfig);

    expect(warnings).toHaveLength(0);
    const dataTypes = getEFormidlingConfig(rootElement).dataTypes;
    expect(
      dataTypes.map((element) => ({
        env: element.env,
        values: element.values.map((value) => value.dataType),
      })),
    ).toEqual([
      { env: undefined, values: ['ref-data-as-pdf', 'model'] },
      { env: 'production', values: ['ref-data-as-pdf'] },
    ]);
  });

  it('serializes an EFormidlingDataTypes element built with moddle.create back to dataTypes and dataType elements', async () => {
    const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
    const { rootElement } = await moddle.fromXML(bpmnXmlWithEFormidlingConfig);

    getEFormidlingConfig(rootElement).dataTypes = [
      moddle.create('altinn:EFormidlingDataTypes', {
        env: undefined,
        values: [moddle.create('altinn:DataType', { dataType: 'model' })],
      }),
      moddle.create('altinn:EFormidlingDataTypes', {
        env: 'tt02',
        values: [moddle.create('altinn:DataType', { dataType: 'ref-data-as-pdf' })],
      }),
    ] as unknown as EFormidlingDataTypesElement[];
    const { xml: savedXml } = await moddle.toXML(rootElement, { format: true });

    expect(savedXml).toContain('<altinn:dataTypes>');
    expect(savedXml).toContain('<altinn:dataType>model</altinn:dataType>');
    expect(savedXml).toContain('<altinn:dataTypes env="tt02">');
    expect(savedXml).toContain('<altinn:dataType>ref-data-as-pdf</altinn:dataType>');
  });

  // `toEnvironmentConfigElements` hands an unchanged entry its own element back instead of building
  // a new one from `{env, value}`. This is the deletion that prevents: everything the parsed
  // element carries beyond the two declared properties - here an attribute moddle parked in
  // `$attrs` - was otherwise written away by an edit to a different entry entirely.
  it('keeps an undeclared attribute on an untouched entry when a sibling entry is edited', async () => {
    const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
    const { rootElement, warnings } = await moddle.fromXML(
      bpmnXmlWithUndeclaredCorrespondenceResourceAttribute,
    );
    // The one warning is moddle reporting the attribute it does not know. It parks it in `$attrs`
    // all the same, which is the thing a re-created element leaves behind.
    expect(warnings).toHaveLength(1);

    const signatureConfig = getSignatureConfig(rootElement);
    const existingElements = signatureConfig.correspondenceResource;
    const editedEntries = fromEnvironmentConfigElements(existingElements).map((entry) =>
      entry.env === 'tt02' ? { ...entry, value: 'resource-edited' } : entry,
    );
    signatureConfig.correspondenceResource = toEnvironmentConfigElements(
      editedEntries,
      moddle as unknown as Moddle,
      existingElements,
    );
    const { xml: savedXml } = await moddle.toXML(rootElement, { format: true });

    expect(savedXml).toContain(
      '<altinn:correspondenceResource fallback="later-version">resource-global</altinn:correspondenceResource>',
    );
    expect(savedXml).toContain(
      '<altinn:correspondenceResource env="tt02">resource-edited</altinn:correspondenceResource>',
    );
  });
});

type EFormidlingDataTypesElement = { env?: string; values: Array<{ dataType: string }> };
type EFormidlingConfigElement = { dataTypes: EFormidlingDataTypesElement[] };
type SignatureConfigElement = { correspondenceResource: ModdleElement[] };
type TaskExtensionElement = {
  eFormidlingConfig: EFormidlingConfigElement;
  signatureConfig: SignatureConfigElement;
};
type ModdleTree = {
  rootElements: Array<{
    flowElements: Array<{ extensionElements: { values: TaskExtensionElement[] } }>;
  }>;
};

const getTaskExtension = (rootElement: unknown): TaskExtensionElement =>
  (rootElement as ModdleTree).rootElements[0].flowElements[0].extensionElements.values[0];

const getEFormidlingConfig = (rootElement: unknown): EFormidlingConfigElement =>
  getTaskExtension(rootElement).eFormidlingConfig;

const getSignatureConfig = (rootElement: unknown): SignatureConfigElement =>
  getTaskExtension(rootElement).signatureConfig;
