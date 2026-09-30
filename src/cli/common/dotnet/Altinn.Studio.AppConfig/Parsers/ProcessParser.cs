using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Documents.Text;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ProcessParser
{
    private const string FileRel = "App/config/process/process.bpmn";

    private const string ConditionExpression = "conditionExpression";

    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        var data = dir.ReadAllBytes(FileRel);
        if (data is null)
            return;

        if (!SourceParse.TryXml(app, FileRel, data, out var doc))
            return;

        var defs = doc.Root;
        if (defs is null)
            return;
        var process = defs.Elements().FirstOrDefault(e => e.Name.LocalName == "process");
        if (process is null)
            return;

        var lineStarts = Spans.LineStarts(data);
        var reachable = ReachableFromStart(process);
        foreach (var kind in _taskElements)
            CollectKind(app, process, kind, reachable, data, lineStarts);
        CollectSequenceFlowExpressions(app, process, data, lineStarts);
    }

    private static readonly string[] _taskElements = ["task", "serviceTask", "userTask", "callActivity", "subProcess"];

    private static HashSet<string>? ReachableFromStart(XElement process)
    {
        var starts = process
            .Elements()
            .Where(e => e.Name.LocalName == "startEvent")
            .Select(e => e.Attribute("id")?.Value)
            .OfType<string>()
            .ToList();
        if (starts.Count == 0)
            return null;
        var targetsBySource = process
            .Elements()
            .Where(e => e.Name.LocalName == "sequenceFlow")
            .ToLookup(
                e => e.Attribute("sourceRef")?.Value ?? "",
                e => e.Attribute("targetRef")?.Value ?? "",
                StringComparer.Ordinal
            );
        var reached = new HashSet<string>(starts, StringComparer.Ordinal);
        var pending = new Queue<string>(starts);
        while (pending.TryDequeue(out var source))
        {
            foreach (var target in targetsBySource[source])
                if (target.Length > 0 && reached.Add(target))
                    pending.Enqueue(target);
        }
        return reached;
    }

    private static readonly HashSet<string> _processExpressionFunctions = new(StringComparer.Ordinal)
    {
        "dataModel",
        "countDataElements",
        "text",
    };

    private static void CollectSequenceFlowExpressions(
        AppModelBuilder app,
        XElement process,
        byte[] data,
        int[] lineStarts
    )
    {
        var flows = process.Elements().Where(e => e.Name.LocalName == "sequenceFlow").ToArray();
        for (int i = 0; i < flows.Length; i++)
        {
            var cond = flows[i].Elements().FirstOrDefault(e => e.Name.LocalName == ConditionExpression);
            if (cond is null)
                continue;
            var xmlPtr = $"/process/sequenceFlow[{i}]/{ConditionExpression}";
            var (eLine, eCol) = XmlPositions.LineCol(cond, data, lineStarts);
            var elementPos = new SourceSpan(FileRel, xmlPtr, eLine, eCol);

            if (RawTextSlice(data, lineStarts, cond) is not { } s)
                continue;
            JsonDocument doc;
            try
            {
                doc = JsonDocument.Parse(data.AsMemory(s.Start, s.End - s.Start));
            }
            catch (JsonException ex)
            {
                app.ParseErrors.Add(
                    new ParseError(FileRel, $"conditionExpression is not valid JSON: {ex.Message}", elementPos)
                );
                continue;
            }
            using (doc)
            {
                var tokens = StringTokenSpans(data.AsSpan(s.Start, s.End - s.Start));
                SourceSpan SpanAt(string exprPtr)
                {
                    if (tokens.TryGetValue(exprPtr, out var t))
                    {
                        var (sl, sc) = Spans.LineColOf(lineStarts, s.Start + t.Start);
                        var (el2, ec2) = Spans.LineColOf(lineStarts, s.Start + t.End);
                        return new SourceSpan(FileRel, xmlPtr + exprPtr, sl, sc, el2, ec2);
                    }
                    return elementPos with { Pointer = xmlPtr + exprPtr };
                }
                ExpressionWalker.CollectValue(
                    app,
                    ownerId: "",
                    FileRel,
                    ptr: "",
                    doc.RootElement,
                    _processExpressionFunctions,
                    SpanAt
                );
            }
        }
    }

    private static (int Start, int End)? RawTextSlice(byte[] data, int[] lineStarts, XElement el)
    {
        if (el.Nodes().OfType<XText>().FirstOrDefault() is not { } text || !((IXmlLineInfo)text).HasLineInfo())
            return null;
        var info = (IXmlLineInfo)text;
        var start = XmlPositions.ByteOffset(data, lineStarts, info.LineNumber, info.LinePosition);
        var length = data.AsSpan(start).IndexOf(text is XCData ? "]]>"u8 : "<"u8);
        return length > 0 ? (start, start + length) : null;
    }

    private static Dictionary<string, (int Start, int End)> StringTokenSpans(ReadOnlySpan<byte> json)
    {
        var map = new Dictionary<string, (int Start, int End)>(StringComparer.Ordinal);
        var ptrs = new Stack<string>();
        var counters = new Stack<int>();
        string? prop = null;

        string ValuePointer()
        {
            if (counters.Count == 0)
                return "";
            var parent = ptrs.Peek();
            if (prop is not null)
            {
                var p = parent + "/" + prop;
                prop = null;
                return p;
            }
            var i = counters.Pop();
            counters.Push(i + 1);
            return parent + "/" + i;
        }

        var reader = new Utf8JsonReader(json);
        while (reader.Read())
        {
            switch (reader.TokenType)
            {
                case JsonTokenType.PropertyName:
                    prop = reader.GetString();
                    break;
                case JsonTokenType.StartArray:
                case JsonTokenType.StartObject:
                    ptrs.Push(ValuePointer());
                    counters.Push(0);
                    break;
                case JsonTokenType.EndArray:
                case JsonTokenType.EndObject:
                    ptrs.Pop();
                    counters.Pop();
                    break;
                case JsonTokenType.String:
                    map[ValuePointer()] = ((int)reader.TokenStartIndex, (int)reader.BytesConsumed);
                    break;
                default:
                    ValuePointer();
                    break;
            }
        }
        return map;
    }

    private static readonly HashSet<string> _runtimeTaskElements = new(StringComparer.Ordinal)
    {
        "task",
        "serviceTask",
    };

    private static void CollectKind(
        AppModelBuilder app,
        XElement process,
        string kind,
        HashSet<string>? reachable,
        byte[] data,
        int[] lineStarts
    )
    {
        var tasks = process.Elements().Where(e => e.Name.LocalName == kind).ToArray();
        for (int i = 0; i < tasks.Length; i++)
        {
            var t = tasks[i];
            var id = t.Attribute("id")?.Value ?? "";
            var taskType = ExtractTaskType(t);
            var ptr = $"/process/{kind}[{i}]";
            var (line, col) = XmlPositions.LineCol(t, data, lineStarts);
            var pos = new SourceSpan(FileRel, ptr, line, col);

            app.Tasks.Add(new ProcessTask(id, taskType, pos, Reachable: reachable is null || reachable.Contains(id)));

            CollectConfigRefs(app, t, id, ptr, data, lineStarts);

            var isRuntimeTask = _runtimeTaskElements.Contains(kind);
            if (string.IsNullOrEmpty(taskType) && isRuntimeTask)
            {
                app.RecordCoverageGap("bpmn.missingTaskType", $"task \"{id}\" has no <altinn:taskType> extension", pos);
            }

            if (!isRuntimeTask)
            {
                app.RecordCoverageGap(
                    "bpmn." + kind,
                    $"element {kind} (id=\"{id}\") is treated as a process task but the parser does not model {kind}-specific semantics",
                    pos
                );
            }
        }
    }

    private static readonly byte[] _xmlWhitespace = " \t\r\n"u8.ToArray();

    private static readonly string[] _singleDataTypeElements =
    {
        "signatureDataType",
        "signeeStatesDataTypeId",
        "signingPdfDataType",
        "paymentDataType",
        "paymentReceiptPdfDataType",
        "subformDataTypeId",
    };

    private static readonly (string List, string Item)[] _dataTypeListElements =
    {
        ("dataTypesToSign", "dataType"),
        ("dataTypes", "dataType"),
    };

    private static void CollectConfigRefs(
        AppModelBuilder app,
        XElement task,
        string taskId,
        string taskPtr,
        byte[] data,
        int[] lineStarts
    )
    {
        foreach (var name in _singleDataTypeElements)
        {
            foreach (var (value, pos) in ElementValues(task, name, taskPtr, data, lineStarts))
                app.Refs.DataTypes.Add(new DataTypeReference(value, pos));
        }

        foreach (var (list, item) in _dataTypeListElements)
        {
            foreach (var (value, pos) in ListValues(task, list, item, taskPtr, data, lineStarts))
                app.Refs.DataTypes.Add(new DataTypeReference(value, pos));
        }

        foreach (var (value, pos) in ListValues(task, "autoPdfTaskIds", "taskId", taskPtr, data, lineStarts))
            app.Refs.TaskIds.Add(new TaskIdReference(value, pos));

        foreach (var (value, pos) in ElementValues(task, "filenameTextResourceKey", taskPtr, data, lineStarts))
            app.Refs.TextResources.Add(new TextResourceReference(value, taskId, "filenameTextResourceKey", pos));
    }

    private static IEnumerable<(string Value, SourceSpan Position)> ElementValues(
        XElement task,
        string name,
        string taskPtr,
        byte[] data,
        int[] lineStarts
    )
    {
        foreach (var el in task.Descendants().Where(e => e.Name.LocalName == name))
        {
            var value = el.Value.Trim();
            if (value.Length == 0)
                continue;
            yield return (value, TextValueSpan(el, value, $"{taskPtr}/{name}", data, lineStarts));
        }
    }

    private static IEnumerable<(string Value, SourceSpan Position)> ListValues(
        XElement task,
        string listName,
        string itemName,
        string taskPtr,
        byte[] data,
        int[] lineStarts
    )
    {
        foreach (var list in task.Descendants().Where(e => e.Name.LocalName == listName))
        {
            int j = 0;
            foreach (var item in list.Elements().Where(e => e.Name.LocalName == itemName))
            {
                var value = item.Value.Trim();
                if (value.Length != 0)
                    yield return (value, TextValueSpan(item, value, $"{taskPtr}/{listName}/{j}", data, lineStarts));
                j++;
            }
        }
    }

    private static SourceSpan TextValueSpan(XElement el, string value, string pointer, byte[] data, int[] lineStarts)
    {
        var (line, col) = XmlPositions.LineCol(el, data, lineStarts);
        var elementStart = new SourceSpan(FileRel, pointer, line, col);
        if (el.FirstNode is not XText text || text is XCData || text.NextNode is not null)
            return elementStart;
        var info = (IXmlLineInfo)text;
        if (!info.HasLineInfo())
            return elementStart;
        var textStart = XmlPositions.ByteOffset(data, lineStarts, info.LineNumber, info.LinePosition);
        var textLength = data.AsSpan(textStart).IndexOf((byte)'<');
        if (textLength < 0)
            return elementStart;
        var raw = data.AsSpan(textStart, textLength);
        var expected = Encoding.UTF8.GetBytes(value);
        if (!raw.Trim(_xmlWhitespace).SequenceEqual(expected))
            return elementStart;
        var valueStart = textStart + raw.Length - raw.TrimStart(_xmlWhitespace).Length;
        var (startLine, startCol) = Spans.LineColOf(lineStarts, valueStart);
        var (endLine, endCol) = Spans.LineColOf(lineStarts, valueStart + expected.Length);
        return new SourceSpan(FileRel, pointer, startLine, startCol, endLine, endCol);
    }

    public static bool IsElementTextSite(SourceSpan site) =>
        string.Equals(site.File, FileRel, StringComparison.Ordinal)
        && !site.Pointer.Contains("/" + ConditionExpression, StringComparison.Ordinal);

    private static string ExtractTaskType(XElement task)
    {
        var ext = task.Elements().FirstOrDefault(e => e.Name.LocalName == "extensionElements");
        if (ext is null)
            return "";
        var taskExt = ext.Elements().FirstOrDefault(e => e.Name.LocalName == "taskExtension");
        if (taskExt is null)
            return "";
        var tt = taskExt.Elements().FirstOrDefault(e => e.Name.LocalName == "taskType");
        return tt?.Value ?? "";
    }

    private static readonly HashSet<string> _taskIdRefAttributes = new(StringComparer.Ordinal)
    {
        "id",
        "sourceRef",
        "targetRef",
        "bpmnElement",
        "attachedToRef",
    };

    public static IReadOnlyList<SourceSpan> TaskIdAttributeSites(byte[] data, string id)
    {
        var sites = new List<SourceSpan>();
        if (id.Length == 0)
            return sites;
        XDocument doc;
        try
        {
            doc = XDocument.Parse(Encoding.UTF8.GetString(data), LoadOptions.SetLineInfo);
        }
        catch (XmlException)
        {
            return sites;
        }
        var lineStarts = Spans.LineStarts(data);
        var expected = Encoding.UTF8.GetBytes("\"" + id + "\"");
        foreach (var el in doc.Descendants())
        {
            foreach (var attr in el.Attributes())
            {
                if (
                    !_taskIdRefAttributes.Contains(attr.Name.LocalName)
                    || !string.Equals(attr.Value, id, StringComparison.Ordinal)
                    || attr is not IXmlLineInfo info
                    || !info.HasLineInfo()
                )
                    continue;
                var nameStart = XmlPositions.ByteOffset(data, lineStarts, info.LineNumber, info.LinePosition);
                if (QuotedValueByteSpan(data, nameStart) is not { } q)
                    continue;
                if (
                    q.End - q.Start != expected.Length
                    || !data.AsSpan(q.Start, expected.Length).SequenceEqual(expected)
                )
                    continue;
                var (sl, sc) = Spans.LineColOf(lineStarts, q.Start);
                var (eln, ec) = Spans.LineColOf(lineStarts, q.End);
                sites.Add(new SourceSpan(FileRel, "", sl, sc, eln, ec));
            }
        }
        return sites;
    }

    private static (int Start, int End)? QuotedValueByteSpan(byte[] data, int from)
    {
        int p = from;
        while (p < data.Length && data[p] != (byte)'=' && data[p] != (byte)'>')
            p++;
        if (p >= data.Length || data[p] != (byte)'=')
            return null;
        p++;
        while (p < data.Length && (data[p] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n'))
            p++;
        if (p >= data.Length || (data[p] != (byte)'"' && data[p] != (byte)'\''))
            return null;
        byte quote = data[p];
        int open = p++;
        while (p < data.Length && data[p] != quote)
            p++;
        return p < data.Length ? (open, p + 1) : null;
    }
}
