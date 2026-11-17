using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Linq;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9;

/// <summary>
/// Adds the content type of each file the v9 app generates to the <c>allowedContentTypes</c> of the data type it
/// stores the file in. v9 stores these files through the instance data unit of work, which refuses a file whose
/// content type a non-empty <c>allowedContentTypes</c> leaves out; v8 inserted them straight into Storage, which
/// does not check. The v8 Designer created a payment task's receipt data type with <c>["application/json"]</c>, so
/// without this the payment task fails at its end, after the user has paid.
///
/// The files, as Altinn.App.Core stores them:
/// <list type="bullet">
/// <item>a <c>payment</c> task's receipt PDF, in <c>paymentConfig/paymentReceiptPdfDataType</c> (PaymentProcessTask.End)</item>
/// <item>a <c>signing</c> task's PDF, in <c>signatureConfig/signingPdfDataType</c> (SigningProcessTask.End)</item>
/// <item>a <c>signing</c> task's signee states as JSON, in <c>signatureConfig/signeeStatesDataTypeId</c> when the task
/// has a <c>signeeProviderId</c> (SigningService.InitializeSignees)</item>
/// <item>the PDF of a <c>pdf</c> or <c>subformPdf</c> service task, in <c>ref-data-as-pdf</c> (PdfService)</item>
/// </list>
///
/// An empty or missing <c>allowedContentTypes</c> accepts any content type and is left alone; a list is only ever
/// extended. Both files are read the way the app reads them: process.bpmn with the first process, the task type
/// from <c>altinn:taskType</c> matched exactly and the first occurrence of each single-valued element;
/// applicationmetadata.json with property names matched case-insensitively, the last of a duplicate property
/// winning, and the first data type with an id being the one used. The file is edited in place, so its formatting
/// and property order are kept.
/// </summary>
internal static class GeneratedFileContentTypesMigration
{
    private const string MetadataPath = "config/applicationmetadata.json";
    private const string ProcessPath = "config/process/process.bpmn";
    private const string PdfContentType = "application/pdf";
    private const string JsonContentType = "application/json";
    private const string PdfServiceDataType = "ref-data-as-pdf";

    private const string ManualCheck =
        "make sure the allowedContentTypes of each data type the app stores a generated file in is empty or includes "
        + "the file's content type: application/pdf for a payment receipt, a signing PDF and ref-data-as-pdf, and "
        + "application/json for signee states.";

    private static readonly XNamespace _bpmnNs = "http://www.omg.org/spec/BPMN/20100524/MODEL";
    private static readonly XNamespace _altinnNs = "http://altinn.no/process";

    private static readonly JsonReaderOptions _readerOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    public static async Task<MigrationResult> Migrate(string projectFolder)
    {
        var messages = new List<UpgradeMessage>();

        var processFile = AppFiles.Resolve(projectFolder, ProcessPath);
        var metadataFile = AppFiles.Resolve(projectFolder, MetadataPath);
        if (processFile is null || metadataFile is null)
            return new MigrationResult(messages);

        List<GeneratedFile> generatedFiles;
        try
        {
            generatedFiles = ReadGeneratedFiles(await File.ReadAllBytesAsync(processFile));
        }
        catch (Exception ex) when (ex is DecoderFallbackException or XmlException)
        {
            messages.Todo($"Could not read {ProcessPath} ({ex.Message}); {ManualCheck}");
            return new MigrationResult(messages);
        }

        if (generatedFiles.Count == 0)
            return new MigrationResult(messages);

        byte[] json;
        bool hadBom;
        List<DataType> dataTypes;
        try
        {
            var decoded = Utf8TextFile.Decode(await File.ReadAllBytesAsync(metadataFile));
            json = Encoding.UTF8.GetBytes(decoded.Text);
            hadBom = decoded.HadBom;
            dataTypes = ReadDataTypes(json);
        }
        catch (Exception ex) when (ex is DecoderFallbackException or JsonException)
        {
            messages.Todo($"Could not read {MetadataPath} ({ex.Message}); {ManualCheck}");
            return new MigrationResult(messages);
        }

        var insertions = new List<(int Position, string Text)>();
        foreach (var filesOfDataType in generatedFiles.GroupBy(file => file.DataTypeId, StringComparer.Ordinal))
        {
            var dataTypeId = filesOfDataType.Key;
            if (dataTypes.Find(dataType => dataType.Id == dataTypeId)?.AllowedContentTypes is not { } allowed)
                continue;

            var missing = filesOfDataType
                .Select(file => file.ContentType)
                .Distinct(StringComparer.Ordinal)
                .Where(contentType => !allowed.Values.Contains(contentType))
                .ToList();
            if (missing.Count == 0)
                continue;

            var separator = Separator(json, allowed.LastItemStart);
            insertions.Add(
                (allowed.LastItemEnd, string.Concat(missing.Select(contentType => $",{separator}\"{contentType}\"")))
            );

            foreach (var contentType in missing)
            {
                var producers = filesOfDataType
                    .Where(file => file.ContentType == contentType)
                    .Select(file => file.Description);
                messages.Warn(
                    $"Added {contentType} to allowedContentTypes on data type '{dataTypeId}' in {MetadataPath}. v9 "
                        + $"stores {JoinWithAnd(producers)} there, and refuses a file whose content type the data type "
                        + "does not allow."
                );
            }
        }

        if (insertions.Count == 0)
            return new MigrationResult(messages);

        var result = new List<byte>(json.Length + 64 * insertions.Count);
        var copied = 0;
        foreach (var (position, text) in insertions.OrderBy(insertion => insertion.Position))
        {
            result.AddRange(json.AsSpan(copied, position - copied));
            result.AddRange(Encoding.UTF8.GetBytes(text));
            copied = position;
        }
        result.AddRange(json.AsSpan(copied));

        await Utf8TextFile.Write(metadataFile, Encoding.UTF8.GetString([.. result]), hadBom);
        return new MigrationResult(messages);
    }

    /// <summary>
    /// Lists the files the tasks of the process store, in document order. Reads the process the way the app
    /// deserializes it: the first <c>process</c> of the definitions, its <c>task</c> and <c>serviceTask</c>
    /// elements, the first occurrence of each single-valued extension element, and the task type and data type ids
    /// exactly as written.
    /// </summary>
    private static List<GeneratedFile> ReadGeneratedFiles(byte[] bpmn)
    {
        // Strict decode, as the process rewriters do, and without the BOM XDocument.Parse rejects.
        var doc = XDocument.Parse(Utf8TextFile.Decode(bpmn).Text);
        var files = new List<GeneratedFile>();
        if (doc.Root is not { } definitions || definitions.Name != _bpmnNs + "definitions")
            return files;

        var process = definitions.Element(_bpmnNs + "process");
        var tasks =
            process?.Elements().Where(e => e.Name == _bpmnNs + "task" || e.Name == _bpmnNs + "serviceTask") ?? [];
        foreach (var task in tasks)
        {
            var extension = task.Element(_bpmnNs + "extensionElements")?.Element(_altinnNs + "taskExtension");
            if (extension is null)
                continue;

            var taskId = task.Attribute("id")?.Value ?? "<unknown>";
            switch (extension.Element(_altinnNs + "taskType")?.Value)
            {
                case "payment":
                    Add(
                        extension
                            .Element(_altinnNs + "paymentConfig")
                            ?.Element(_altinnNs + "paymentReceiptPdfDataType"),
                        PdfContentType,
                        $"the receipt of payment task '{taskId}'"
                    );
                    break;
                case "signing":
                    var signatureConfig = extension.Element(_altinnNs + "signatureConfig");
                    Add(
                        signatureConfig?.Element(_altinnNs + "signingPdfDataType"),
                        PdfContentType,
                        $"the PDF of signing task '{taskId}'"
                    );
                    if (signatureConfig?.Element(_altinnNs + "signeeProviderId") is not null)
                    {
                        Add(
                            signatureConfig.Element(_altinnNs + "signeeStatesDataTypeId"),
                            JsonContentType,
                            $"the signee states of signing task '{taskId}'"
                        );
                    }
                    break;
                case "pdf":
                    files.Add(new(PdfServiceDataType, PdfContentType, $"the PDF of PDF service task '{taskId}'"));
                    break;
                case "subformPdf":
                    files.Add(
                        new(PdfServiceDataType, PdfContentType, $"the PDFs of subform PDF service task '{taskId}'")
                    );
                    break;
            }
        }

        return files;

        void Add(XElement? dataTypeElement, string contentType, string description)
        {
            if (dataTypeElement is not null)
                files.Add(new GeneratedFile(dataTypeElement.Value, contentType, description));
        }
    }

    /// <summary>
    /// Finds the objects in the root <c>dataTypes</c> array, each with its id and its <c>allowedContentTypes</c>
    /// list. A list is kept only when it is a non-empty array, with the byte positions of its last item, so that an
    /// item can be added after it as written.
    /// </summary>
    private static List<DataType> ReadDataTypes(byte[] json)
    {
        var reader = new Utf8JsonReader(json, _readerOptions);
        var dataTypes = new List<DataType>();
        string? rootProperty = null;
        var inDataTypes = false;
        DataType? current = null;

        while (reader.Read())
        {
            switch (reader.TokenType, reader.CurrentDepth)
            {
                case (JsonTokenType.PropertyName, 1):
                    rootProperty = reader.GetString();
                    break;
                case (JsonTokenType.StartArray, 1):
                    inDataTypes = IsProperty(rootProperty, "dataTypes");
                    // The app keeps the last of duplicate properties.
                    if (inDataTypes)
                        dataTypes = [];
                    break;
                case (JsonTokenType.EndArray, 1):
                    inDataTypes = false;
                    break;
                case (JsonTokenType.StartObject, 2) when inDataTypes:
                    current = new DataType();
                    dataTypes.Add(current);
                    break;
                case (JsonTokenType.EndObject, 2):
                    current = null;
                    break;
                case (JsonTokenType.PropertyName, 3) when current is not null:
                    var name = reader.GetString();
                    // A value of another kind than the ones read here is skipped token by token by the loop; no
                    // case matches inside it.
                    if (IsProperty(name, "id") && reader.Read())
                        current.Id = reader.TokenType == JsonTokenType.String ? reader.GetString() : null;
                    else if (IsProperty(name, "allowedContentTypes") && reader.Read())
                        current.AllowedContentTypes = ReadContentTypes(ref reader);
                    break;
            }
        }

        return dataTypes;
    }

    /// <summary>
    /// Reads the <c>allowedContentTypes</c> value the reader is on. Returns null for anything but a non-empty array,
    /// which the app either accepts any content type for or cannot load.
    /// </summary>
    private static ContentTypeList? ReadContentTypes(ref Utf8JsonReader reader)
    {
        if (reader.TokenType != JsonTokenType.StartArray)
            return null;

        var arrayDepth = reader.CurrentDepth;
        var list = new ContentTypeList();
        var itemCount = 0;
        while (reader.Read() && !(reader.TokenType == JsonTokenType.EndArray && reader.CurrentDepth == arrayDepth))
        {
            if (reader.CurrentDepth != arrayDepth + 1)
                continue;

            var start = (int)reader.TokenStartIndex;
            switch (reader.TokenType)
            {
                case JsonTokenType.String:
                    list.Values.Add(reader.GetString());
                    // The value as written, escapes included, plus its quotes.
                    (list.LastItemStart, list.LastItemEnd) = (start, start + reader.ValueSpan.Length + 2);
                    itemCount++;
                    break;
                case JsonTokenType.Number or JsonTokenType.True or JsonTokenType.False or JsonTokenType.Null:
                    (list.LastItemStart, list.LastItemEnd) = (start, start + reader.ValueSpan.Length);
                    itemCount++;
                    break;
                case JsonTokenType.StartObject or JsonTokenType.StartArray:
                    list.LastItemStart = start;
                    itemCount++;
                    break;
                case JsonTokenType.EndObject or JsonTokenType.EndArray:
                    list.LastItemEnd = start + 1;
                    break;
            }
        }

        return itemCount > 0 ? list : null;
    }

    /// <summary>
    /// What to write between the last item and an added one, after the comma: the line break and indentation before
    /// the last item when the items are on lines of their own, otherwise the spacing before it, or a single space.
    /// </summary>
    private static string Separator(byte[] json, int lastItemStart)
    {
        var whitespaceStart = lastItemStart;
        while (whitespaceStart > 0 && json[whitespaceStart - 1] is (byte)' ' or (byte)'\t' or (byte)'\r' or (byte)'\n')
            whitespaceStart--;

        var whitespace = Encoding.UTF8.GetString(json, whitespaceStart, lastItemStart - whitespaceStart);
        var lineBreak = whitespace.LastIndexOf('\n');
        if (lineBreak < 0)
            return whitespace.Length > 0 ? whitespace : " ";

        var newline = lineBreak > 0 && whitespace[lineBreak - 1] == '\r' ? "\r\n" : "\n";
        return newline + whitespace[(lineBreak + 1)..];
    }

    private static bool IsProperty(string? name, string property) =>
        string.Equals(name, property, StringComparison.OrdinalIgnoreCase);

    private static string JoinWithAnd(IEnumerable<string> items)
    {
        var list = items.ToList();
        return list.Count <= 1 ? string.Concat(list) : $"{string.Join(", ", list.Take(list.Count - 1))} and {list[^1]}";
    }

    /// <summary>A file a task stores: the data type it is stored in, its content type, and what it is.</summary>
    private sealed record GeneratedFile(string DataTypeId, string ContentType, string Description);

    private sealed class DataType
    {
        public string? Id { get; set; }

        public ContentTypeList? AllowedContentTypes { get; set; }
    }

    private sealed class ContentTypeList
    {
        public List<string?> Values { get; } = [];

        public int LastItemStart { get; set; }

        public int LastItemEnd { get; set; }
    }
}
