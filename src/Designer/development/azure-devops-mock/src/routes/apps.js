export const appMetadataRoute = async (req, res) => {
  const { org, app } = req.params;

  res.json({
    id: `${org}/${app}`,
    altinnNugetVersion: '8.5.3.108',
    org,
    title: { nb: app },
    dataTypes: [
      {
        id: 'model',
        description: null,
        allowedContentTypes: ['application/xml'],
        allowedContributers: null,
        appLogic: {
          autoCreate: true,
          classRef: 'Altinn.App.Models.Model',
          schemaRef: null,
          allowAnonymousOnStateless: false,
          autoDeleteOnProcessEnd: false,
          shadowFields: null,
        },
        taskId: 'Task_1',
        maxSize: null,
        maxCount: 1,
        minCount: 1,
        grouping: null,
        enablePdfCreation: false,
        enableFileScan: false,
        validationErrorOnPendingFileScan: false,
        enabledFileAnalysers: [],
        enabledFileValidators: [],
      },
      {
        id: 'fileUpload',
        taskId: 'Task_1',
        maxSize: 5,
        maxCount: 3,
        minCount: 0,
        enablePdfCreation: false,
        enableFileScan: false,
        validationErrorOnPendingFileScan: false,
      },
      {
        id: 'signature',
        allowedContentTypes: ['application/json'],
        taskId: 'Task_2',
        maxSize: 25,
        maxCount: 1,
        minCount: 1,
        enablePdfCreation: false,
        enableFileScan: false,
        validationErrorOnPendingFileScan: false,
        enabledFileAnalysers: [],
        enabledFileValidators: [],
      },
      {
        id: 'ref-data-as-pdf',
        description: null,
        allowedContentTypes: ['application/pdf'],
        allowedContributers: null,
        appLogic: null,
        taskId: null,
        maxSize: null,
        maxCount: 0,
        minCount: 0,
        grouping: null,
        enablePdfCreation: false,
        enableFileScan: false,
        validationErrorOnPendingFileScan: false,
        enabledFileAnalysers: [],
        enabledFileValidators: [],
      },
    ],
    partyTypesAllowed: {
      bankruptcyEstate: false,
      organisation: false,
      person: false,
      subUnit: false,
    },
    autoDeleteOnProcessEnd: false,
    created: '2024-02-06T15:18:12.2060944Z',
    createdBy: 'studio',
    lastChanged: '2024-02-06T15:18:12.2062288Z',
    lastChangedBy: 'studio',
  });
};

export const appProcessRoute = async (_, res) => {
  res.setHeader('content-type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="utf-8"?>
    <bpmn:definitions id="Altinn_SingleDataTask_Process_Definition" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:altinn="http://altinn.no/process" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" targetNamespace="http://bpmn.io/schema/bpmn">
      <bpmn:process id="SingleDataTask" isExecutable="false">
        <bpmn:startEvent id="StartEvent_1">
          <bpmn:outgoing>SequenceFlow_1</bpmn:outgoing>
        </bpmn:startEvent>
        <bpmn:task id="Task_1" name="Utfylling">
          <bpmn:incoming>SequenceFlow_1</bpmn:incoming>
          <bpmn:outgoing>SequenceFlow_2</bpmn:outgoing>
          <bpmn:extensionElements>
            <altinn:taskExtension>
              <altinn:taskType>data</altinn:taskType>
            </altinn:taskExtension>
          </bpmn:extensionElements>
        </bpmn:task>
        <bpmn:task id="Task_2" name="Signering">
            <bpmn:incoming>SequenceFlow_2</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_3</bpmn:outgoing>
            <bpmn:extensionElements>
                <altinn:taskExtension>
                    <altinn:taskType>signing</altinn:taskType>
                    <altinn:actions>
                        <altinn:action>reject</altinn:action>
                        <altinn:action>sign</altinn:action>
                    </altinn:actions>
                    <altinn:signatureConfig>
                        <altinn:dataTypesToSign>
                            <altinn:dataType>model</altinn:dataType>
                        </altinn:dataTypesToSign>
                        <altinn:signatureDataType>signature</altinn:signatureDataType>
                    </altinn:signatureConfig>
                </altinn:taskExtension>
            </bpmn:extensionElements>
        </bpmn:task>
        <bpmn:serviceTask id="Task_eFormidling" name="eFormidling">
            <bpmn:extensionElements>
                <altinn:taskExtension>
                    <altinn:taskType>eFormidling</altinn:taskType>
                    <altinn:eFormidlingConfig>
                        <altinn:disabled env="local">true</altinn:disabled>
                        <altinn:receiver>991825827</altinn:receiver>
                        <altinn:process>urn:no:difi:profile:arkivmelding:administrasjon:ver1.0</altinn:process>
                        <altinn:standard>urn:no:difi:arkivmelding:xsd::arkivmelding</altinn:standard>
                        <altinn:typeVersion>2.0</altinn:typeVersion>
                        <altinn:type>arkivmelding</altinn:type>
                        <altinn:securityLevel>3</altinn:securityLevel>
                        <altinn:dpfShipmentType>digital</altinn:dpfShipmentType>
                        <altinn:dataTypes>
                            <altinn:dataType>model</altinn:dataType>
                            <altinn:dataType>ref-data-as-pdf</altinn:dataType>
                        </altinn:dataTypes>
                    </altinn:eFormidlingConfig>
                </altinn:taskExtension>
            </bpmn:extensionElements>
            <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
            <bpmn:outgoing>SequenceFlow_4</bpmn:outgoing>
        </bpmn:serviceTask>
        <bpmn:endEvent id="EndEvent_1">
          <bpmn:incoming>SequenceFlow_3</bpmn:incoming>
        </bpmn:endEvent>
        <bpmn:sequenceFlow id="SequenceFlow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
        <bpmn:sequenceFlow id="SequenceFlow_2" sourceRef="Task_1" targetRef="Task_2" />
        <bpmn:sequenceFlow id="SequenceFlow_3" sourceRef="Task_2" targetRef="Task_eFormidling" />
        <bpmn:sequenceFlow id="SequenceFlow_4" sourceRef="Task_eFormidling" targetRef="EndEvent_1" />
      </bpmn:process>
    </bpmn:definitions>`);
};
