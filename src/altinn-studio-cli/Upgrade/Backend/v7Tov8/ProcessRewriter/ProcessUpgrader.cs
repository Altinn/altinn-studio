using System.Text;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.Backend.v7Tov8.ProcessRewriter;

/// <summary>
/// Upgrade the process file
/// </summary>
internal sealed class ProcessUpgrader
{
    private readonly XDocument _doc;
    private readonly string _processFile;
    private readonly XNamespace _newAltinnNs = "http://altinn.no/process";
    private readonly XNamespace _origAltinnNs = "http://altinn.no";
    private readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private readonly IList<string> _warnings = new List<string>();

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessUpgrader"/> class.
    /// </summary>
    /// <param name="processFile"></param>
    public ProcessUpgrader(string processFile)
    {
        _processFile = processFile;
        var xmlString = File.ReadAllText(processFile);
        xmlString = xmlString.Replace($"xmlns:altinn=\"{_origAltinnNs}\"", $"xmlns:altinn=\"{_newAltinnNs}\"");
        _doc = XDocument.Parse(xmlString);
    }

    /// <summary>
    /// Upgrade the process file, the changes will not be written to disk until Write is called
    /// </summary>
    public void Upgrade()
    {
        var definitions = _doc.Root;
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

    /// <summary>
    /// Write the changes to disk
    /// </summary>
    public async Task Write()
    {
        XmlWriterSettings xws = new XmlWriterSettings();
        xws.Async = true;
        xws.OmitXmlDeclaration = false;
        xws.Indent = true;
        xws.Encoding = Encoding.UTF8;
        await using XmlWriter xw = XmlWriter.Create(_processFile, xws);
        await _doc.WriteToAsync(xw, CancellationToken.None);
    }

    /// <summary>
    /// Gets the warnings from the upgrade
    /// </summary>
    /// <returns></returns>
    public IList<string> GetWarnings()
    {
        return _warnings;
    }

    private void UpgradeTask(XElement processElement)
    {
        var taskTypeAttr = processElement.Attribute(_newAltinnNs + "tasktype");
        var taskType = taskTypeAttr?.Value;
        if (taskType is null)
        {
            return;
        }
        XElement extensionElements =
            processElement.Element(_bpmnNs + "extensionElements") ?? new XElement(_bpmnNs + "extensionElements");
        XElement taskExtensionElement =
            extensionElements.Element(_newAltinnNs + "taskExtension") ?? new XElement(_newAltinnNs + "taskExtension");
        XElement taskTypeElement = new XElement(_newAltinnNs + "taskType");
        taskTypeElement.Value = taskType;
        taskExtensionElement.Add(taskTypeElement);
        extensionElements.Add(taskExtensionElement);
        processElement.Add(extensionElements);
        taskTypeAttr?.Remove();
        if (taskType.Equals("confirmation", StringComparison.Ordinal))
        {
            AddAction(processElement, "confirm");
        }
    }

    private void UpgradeSequenceFlow(XElement processElement)
    {
        var idAttr = processElement.Attribute("id");
        if (idAttr?.Value is null)
            throw new InvalidOperationException("SequenceFlow element is missing required 'id' attribute");

        var sourceRefAttr = processElement.Attribute("sourceRef");
        if (sourceRefAttr?.Value is null)
            throw new InvalidOperationException(
                $"SequenceFlow '{idAttr.Value}' is missing required 'sourceRef' attribute"
            );

        var targetRefAttr = processElement.Attribute("targetRef");
        if (targetRefAttr?.Value is null)
            throw new InvalidOperationException(
                $"SequenceFlow '{idAttr.Value}' is missing required 'targetRef' attribute"
            );

        var flowTypeAttr = processElement.Attribute(_newAltinnNs + "flowtype");
        flowTypeAttr?.Remove();
        if (flowTypeAttr?.Value != "AbandonCurrentReturnToNext")
        {
            return;
        }

        SetSequenceFlowAsDefaultIfGateway(sourceRefAttr.Value, idAttr.Value);
        var sourceTask = FollowGatewaysAndGetSourceTask(sourceRefAttr.Value);
        AddAction(sourceTask, "reject");
        var conditionExpression = processElement
            .Elements()
            .FirstOrDefault(e => e.Name.LocalName == "conditionExpression");
        if (conditionExpression is null)
        {
            conditionExpression = new XElement(_bpmnNs + "conditionExpression");
            processElement.Add(conditionExpression);
        }
        conditionExpression.Value = "[\"equals\", [\"gatewayAction\"],\"reject\"]";
        _warnings.Add(
            $"SequenceFlow {idAttr.Value} has flowtype {flowTypeAttr.Value} upgrade tool has tried to add reject action to source task. \nPlease verify that process flow is correct and that layoutfiels are updated to use ActionButtons\nRefere to docs.altinn.studio for how actions in v8 work"
        );
    }

    private void SetSequenceFlowAsDefaultIfGateway(string elementRef, string sequenceFlowRef)
    {
        var sourceElement = _doc
            .Root?.Elements()
            .Single(e => e.Name.LocalName == "process")
            .Elements()
            .Single(e => e.Attribute("id")?.Value == elementRef);
        if (sourceElement?.Name.LocalName == "exclusiveGateway")
        {
            if (sourceElement.Attribute("default") is null)
            {
                sourceElement.Add(new XAttribute("default", sequenceFlowRef));
            }
            else
            {
                _warnings.Add(
                    $"Default sequence flow already set for gateway {elementRef}. Process is most likely not correct. Please correct it manually and test it."
                );
            }
        }
    }

    private XElement FollowGatewaysAndGetSourceTask(string sourceRef)
    {
        var processElement = _doc.Root?.Elements().Single(e => e.Name.LocalName == "process");
        var sourceElement = processElement?.Elements().Single(e => e.Attribute("id")?.Value == sourceRef);
        if (sourceElement?.Name.LocalName == "task")
        {
            return sourceElement;
        }

        if (sourceElement?.Name.LocalName == "exclusiveGateway")
        {
            var incomingSequenceFlow = sourceElement.Elements().Single(e => e.Name.LocalName == "incoming").Value;
            var incomingSequenceFlowRef = processElement
                ?.Elements()
                .Single(e =>
                {
                    var idAttr = e.Attribute("id");
                    if (idAttr?.Value is null)
                        throw new InvalidOperationException("Process element is missing required 'id' attribute");
                    return idAttr.Value == incomingSequenceFlow;
                })
                .Attribute("sourceRef")
                ?.Value;
            if (incomingSequenceFlowRef is null)
                throw new InvalidOperationException("Could not find source reference for incoming sequence flow");
            return FollowGatewaysAndGetSourceTask(incomingSequenceFlowRef);
        }

        throw new InvalidOperationException("Unexpected element type");
    }

    private void AddAction(XElement sourceTask, string actionName)
    {
        var extensionElements = sourceTask.Element(_bpmnNs + "extensionElements");
        if (extensionElements is null)
        {
            extensionElements = new XElement(_bpmnNs + "extensionElements");
            sourceTask.Add(extensionElements);
        }

        var taskExtensionElement = extensionElements.Element(_newAltinnNs + "taskExtension");
        if (taskExtensionElement is null)
        {
            taskExtensionElement = new XElement(_newAltinnNs + "taskExtension");
            extensionElements.Add(taskExtensionElement);
        }

        var actions = taskExtensionElement.Element(_newAltinnNs + "actions");
        if (actions is null)
        {
            actions = new XElement(_newAltinnNs + "actions");
            taskExtensionElement.Add(actions);
        }
        if (actions.Elements().Any(e => e.Value == actionName))
        {
            return;
        }
        var action = new XElement(_newAltinnNs + "action");
        action.Value = actionName;
        actions.Add(action);
    }
}
