using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Implementation.ProcessModeling;

// Compares task changes, excluding a declared rename, and removes stale signature references.
internal sealed class ProcessSnapshotChange
{
    private static readonly XNamespace s_bpmn = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static readonly XNamespace s_altinn = "http://altinn.no/process";
    private static readonly UTF8Encoding s_utf8WithoutBom = new(encoderShouldEmitUTF8Identifier: false);

    internal XDocument Document { get; }

    // When false, the submitted XML can be saved without serializing the parsed document.
    internal bool DocumentModified { get; }

    internal XElement[] AddedTasks { get; }

    internal XElement[] RemovedTasks { get; }

    internal string[] DeletedDataTypeIds { get; }

    internal IReadOnlyDictionary<string, string> RetainedDataTypeOwners { get; }

    private ProcessSnapshotChange(XDocument previous, XDocument proposed, TaskIdChange? rename)
    {
        Dictionary<string, XElement> previousTasks = GetTasks(previous);
        Dictionary<string, XElement> nextTasks = GetTasks(proposed);
        ValidateTaskChanges(previousTasks, nextTasks, rename);
        RemovedTasks = previousTasks
            .Where(task => !nextTasks.ContainsKey(task.Key) && task.Key != rename?.OldId)
            .Select(task => task.Value)
            .ToArray();
        AddedTasks = nextTasks
            .Where(task => !previousTasks.ContainsKey(task.Key) && task.Key != rename?.NewId)
            .Select(task => task.Value)
            .ToArray();
        var retainedOwners = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var task in nextTasks)
        {
            foreach (XElement dataType in GeneratedProcessDataTypes.Elements(task.Value))
            {
                retainedOwners.TryAdd(dataType.Value, task.Key);
            }
        }
        RetainedDataTypeOwners = retainedOwners;
        DeletedDataTypeIds = RemovedTasks
            .SelectMany(GeneratedProcessDataTypes.Elements)
            .Select(element => element.Value)
            .Distinct()
            .Except(retainedOwners.Keys)
            .ToArray();
        HashSet<string> removedSignatures = RemovedTasks
            .Where(task => GetTaskType(task) == "signing")
            .SelectMany(task => task.Descendants(s_altinn + "signatureDataType"))
            .Select(element => element.Value)
            .Except(retainedOwners.Keys)
            .ToHashSet();
        XElement[] staleSignatureReferences = proposed
            .Descendants(s_altinn + "uniqueFromSignaturesInDataTypes")
            .Elements(s_altinn + "dataType")
            .Where(element => removedSignatures.Contains(element.Value))
            .ToArray();
        staleSignatureReferences.Remove();
        DocumentModified = staleSignatureReferences.Length > 0;
        Document = proposed;
    }

    internal static ProcessSnapshotChange Create(string previousXml, string proposedXml, TaskIdChange? rename = null) =>
        new(ParseProcess(previousXml), ParseProcess(proposedXml), rename);

    // Create validates every task, so this cannot reject tasks from an existing snapshot change.
    internal static string? GetTaskType(XElement task)
    {
        XElement[] taskTypes = task.Descendants(s_altinn + "taskType").Take(2).ToArray();
        if (taskTypes.Length > 1)
        {
            throw new ArgumentException($"The task '{(string?)task.Attribute("id")}' has more than one task type.");
        }
        return (string?)taskTypes.SingleOrDefault();
    }

    // Preserve the declaration and parsed whitespace; markup is normalized and emitted as UTF-8 without a BOM.
    internal byte[] SerializeDocument()
    {
        var settings = new XmlWriterSettings
        {
            Encoding = s_utf8WithoutBom,
            // Avoid platform-dependent line endings after the parser normalizes them to LF.
            NewLineChars = "\n",
            OmitXmlDeclaration = Document.Declaration is null,
        };
        using var stream = new MemoryStream();
        using (XmlWriter writer = XmlWriter.Create(stream, settings))
        {
            if (Document.Declaration is { } declaration)
            {
                // XmlWriter would otherwise change the declaration's encoding capitalization.
                writer.WriteProcessingInstruction("xml", GetDeclarationContent(declaration));
            }
            foreach (XNode node in Document.Nodes())
            {
                node.WriteTo(writer);
            }
        }
        return stream.ToArray();
    }

    private static string GetDeclarationContent(XDeclaration declaration)
    {
        var content = new StringBuilder($"version=\"{declaration.Version}\"");
        if (declaration.Encoding is { } encoding)
        {
            bool declaresUtf8 = string.Equals(encoding, "utf-8", StringComparison.OrdinalIgnoreCase);
            content.Append($" encoding=\"{(declaresUtf8 ? encoding : "utf-8")}\"");
        }
        if (declaration.Standalone is { } standalone)
        {
            content.Append($" standalone=\"{standalone}\"");
        }
        return content.ToString();
    }

    private static XDocument ParseProcess(string xml)
    {
        if (Encoding.UTF8.GetByteCount(xml) > 1_000_000)
        {
            throw new ArgumentException("The BPMN file is too large.");
        }
        try
        {
            using var reader = XmlReader.Create(
                new StringReader(xml),
                new XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit }
            );
            XDocument document = XDocument.Load(reader, LoadOptions.PreserveWhitespace);
            if (
                document.Root?.Name != s_bpmn + "definitions"
                || document.Root.Elements(s_bpmn + "process").Count() != 1
            )
            {
                throw new ArgumentException("The BPMN file must contain one process.");
            }
            return document;
        }
        catch (XmlException exception)
        {
            throw new ArgumentException("The BPMN file is not valid XML.", exception);
        }
    }

    private static Dictionary<string, XElement> GetTasks(XDocument document)
    {
        var tasks = new Dictionary<string, XElement>(StringComparer.Ordinal);
        foreach (
            XElement task in document
                .Descendants()
                .Where(element => element.Name == s_bpmn + "task" || element.Name == s_bpmn + "serviceTask")
        )
        {
            string? id = (string?)task.Attribute("id");
            if (string.IsNullOrWhiteSpace(id) || !tasks.TryAdd(id, task))
            {
                throw new ArgumentException("Each process task must have a unique ID.");
            }
            GetTaskType(task);
        }
        return tasks;
    }

    private static void ValidateTaskChanges(
        Dictionary<string, XElement> previous,
        Dictionary<string, XElement> next,
        TaskIdChange? rename
    )
    {
        if (
            rename is not null
            && (
                string.IsNullOrWhiteSpace(rename.OldId)
                || string.IsNullOrWhiteSpace(rename.NewId)
                || !previous.ContainsKey(rename.OldId)
                || previous.ContainsKey(rename.NewId)
                || next.ContainsKey(rename.OldId)
                || !next.ContainsKey(rename.NewId)
                || GetTaskType(previous[rename.OldId]) != GetTaskType(next[rename.NewId])
            )
        )
        {
            throw new ArgumentException("The task ID change must match the previous and new process.");
        }
        // Do not mistake a rename without metadata for deleting one task and creating another.
        if (
            previous.Keys.Except(next.Keys).Any(id => id != rename?.OldId)
            && next.Keys.Except(previous.Keys).Any(id => id != rename?.NewId)
        )
        {
            throw new ArgumentException("A task rename must include the old and new task IDs.");
        }
    }
}
