import BpmnModdle from 'bpmn-moddle';
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

describe('altinnCustomTasks', () => {
  it('preserves the eFormidlingConfig section when the BPMN is parsed and serialized again', async () => {
    const moddle = new BpmnModdle({ altinn: altinnCustomTasks });
    const { rootElement } = await moddle.fromXML(bpmnXmlWithEFormidlingConfig);
    const { xml: savedXml } = await moddle.toXML(rootElement, { format: true });

    expect(savedXml).toMatchSnapshot();
  });
});
