using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace altinn_app_cli.v7Tov8.ProcessRewriter;

public class ProcessUpgrader
{
    private XDocument doc;
    private readonly string processFile;
    private readonly XNamespace newAltinnNs = "http://altinn.no/process";
    private readonly XNamespace origAltinnNs = "http://altinn.no";
    private readonly XNamespace bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private readonly IList<string> warnings = new List<string>();

    public ProcessUpgrader(string processFile)
    {
        this.processFile = processFile;
        var xmlString = File.ReadAllText(processFile);
        xmlString = xmlString.Replace($"xmlns:altinn=\"{origAltinnNs}\"", $"xmlns:altinn=\"{newAltinnNs}\"");
        doc = XDocument.Parse(xmlString);
    }

    public void Upgrade()
    {
        var definitions = doc.Root;
        var process = definitions?.Elements().Single(e => e.Name.LocalName == "process");
        var processElements = process?.Elements() ?? Enumerable.Empty<XElement>();
        foreach (var processElement in processElements)
        {
            if (processElement.Name.LocalName == "task")
            {
                UpgradeTask(processElement);
            }
            else if (processElement.Name.LocalName == "sequenceFlow")
            {
                UpgradeSequenceFlow(processElement);
            }
        }
    }

    private void UpgradeTask(XElement processElement)
    {
        var taskTypeAttr = processElement.Attribute(newAltinnNs + "tasktype");
        var taskType = taskTypeAttr?.Value;
        if (taskType == null)
        {
            return;
        }
        XElement extensionElements = processElement.Element(bpmnNs + "extensionElements") ?? new XElement(bpmnNs + "extensionElements");
        XElement taskExtensionElement = extensionElements.Element(newAltinnNs + "taskExtension") ?? new XElement(newAltinnNs + "taskExtension");
        XElement taskTypeElement = new XElement(newAltinnNs + "taskType");
        taskTypeElement.Value = taskType;
        taskExtensionElement.Add(taskTypeElement);
        extensionElements.Add(taskExtensionElement);
        processElement.Add(extensionElements);
        taskTypeAttr?.Remove();
        if (taskType.Equals("confirmation"))
        {
            AddAction(processElement, "confirm");
        }
    }

    private void UpgradeSequenceFlow(XElement processElement)
    {
        var flowTypeAttr = processElement.Attribute(newAltinnNs + "flowtype");
        flowTypeAttr?.Remove();
        if (flowTypeAttr?.Value != "AbandonCurrentReturnToNext")
        {
            return;
        }
        
        var sourceRefAttr = processElement.Attribute("sourceRef");
        SetSequenceFlowAsDefaultIfGateway(sourceRefAttr?.Value!, processElement.Attribute("id")?.Value!);
        var sourceTask = FollowGatewaysAndGetSourceTask(sourceRefAttr?.Value!);
        AddAction(sourceTask, "reject");
        var conditionExpression = processElement.Elements().FirstOrDefault(e => e.Name.LocalName == "conditionExpression");
        if(conditionExpression == null)
        {
            conditionExpression = new XElement(bpmnNs + "conditionExpression");
            processElement.Add(conditionExpression);
        }
        conditionExpression.Value = "[\"equals\", [\"gatewayAction\"],\"reject\"]";
        warnings.Add($"SequenceFlow {processElement.Attribute("id")?.Value!} has flowtype {flowTypeAttr.Value} upgrade tool has tried to add reject action to source task. \nPlease verify that process flow is correct and that layoutfiels are updated to use ActionButtons\nRefere to docs.altinn.studio for how actions in v8 work");
    }

    private void SetSequenceFlowAsDefaultIfGateway(string elementRef, string sequenceFlowRef)
    {
        var sourceElement = doc.Root?.Elements().Single(e => e.Name.LocalName == "process").Elements().Single(e => e.Attribute("id")?.Value == elementRef);
        if (sourceElement?.Name.LocalName == "exclusiveGateway")
        {
            if (sourceElement.Attribute("default") == null)
            {
                sourceElement.Add(new XAttribute("default", sequenceFlowRef));
            }
            else
            {
                warnings.Add($"Default sequence flow already set for gateway {elementRef}. Process is most likely not correct. Please correct it manually and test it.");
            }
        }
    }
    
    private XElement FollowGatewaysAndGetSourceTask(string sourceRef)
    {
        var processElement = doc.Root?.Elements().Single(e => e.Name.LocalName == "process");
        var sourceElement = processElement?.Elements().Single(e => e.Attribute("id")?.Value == sourceRef);
        if (sourceElement?.Name.LocalName == "task")
        {
            return sourceElement;
        }

        if (sourceElement?.Name.LocalName == "exclusiveGateway")
        {
            var incomingSequenceFlow = sourceElement.Elements().Single(e => e.Name.LocalName == "incoming").Value;
            var incomingSequenceFlowRef = processElement?.Elements().Single(e => e.Attribute("id")!.Value == incomingSequenceFlow).Attribute("sourceRef")?.Value;
            return FollowGatewaysAndGetSourceTask(incomingSequenceFlowRef!);
        }

        throw new Exception("Unexpected element type");
    }

    private void AddAction(XElement sourceTask, string actionName)
    {
        var extensionElements = sourceTask.Element(bpmnNs + "extensionElements");
        if (extensionElements == null)
        {
            extensionElements = new XElement(bpmnNs + "extensionElements");
            sourceTask.Add(extensionElements);
        }

        var taskExtensionElement = extensionElements.Element(newAltinnNs + "taskExtension");
        if (taskExtensionElement == null)
        {
            taskExtensionElement = new XElement(newAltinnNs + "taskExtension");
            extensionElements.Add(taskExtensionElement);
        }

        var actions = taskExtensionElement.Element(newAltinnNs + "actions");
        if (actions == null)
        {
            actions = new XElement(newAltinnNs + "actions");
            taskExtensionElement.Add(actions);
        }
        if(actions.Elements().Any(e => e.Value == actionName))
        {
            return;
        }
        var action = new XElement(newAltinnNs + "action");
        action.Value = actionName;
        actions.Add(action);
    }

    public async Task Write()
    {
        XmlWriterSettings xws = new XmlWriterSettings();
        xws.Async = true;
        xws.OmitXmlDeclaration = false;  
        xws.Indent = true;
        xws.Encoding = Encoding.UTF8;
        await using XmlWriter xw = XmlWriter.Create(processFile, xws);
        await doc.WriteToAsync(xw, CancellationToken.None);
    }
    
    public IList<string> GetWarnings()
    {
        return warnings;
    }
}
