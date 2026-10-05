using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Cli.Upgrade.v8Tov9.PdfServiceTaskMigration;

/// <summary>What the UI folder of a PDF service task will hold.</summary>
internal abstract record PdfTaskUi
{
    /// <summary>
    /// The layout set Altinn Studio creates for a custom PDF: the PDF layout, with its summaries pointing at
    /// the source task, and a waiting page, for anyone who opens the instance while the PDF is generated.
    /// </summary>
    public sealed record OwnLayoutSet(UiFolderFiles Files, PdfLayoutRetargetingResult Retargeting) : PdfTaskUi;

    /// <summary>
    /// A copy of the whole source task folder, because the PDF layout refers to content only that folder
    /// has, as <paramref name="Blockers"/> lists. It renders the PDF as before the upgrade.
    /// </summary>
    public sealed record TaskFolderCopy(UiFolderFiles Files, IReadOnlyList<string> Blockers) : PdfTaskUi;

    /// <summary>
    /// The PDF layout or the task's settings cannot be read. <paramref name="Reason"/> says why and what to do.
    /// </summary>
    public sealed record Unresolved(string Reason) : PdfTaskUi;
}

/// <summary>
/// Plans the UI folder of the PDF service task for a task whose PDF used a custom layout: preferably the
/// layout set Altinn Studio creates for a custom PDF, or a copy of the task folder when the PDF layout
/// cannot leave it (see <see cref="PdfLayoutRetargeting"/>).
/// </summary>
internal static class PdfTaskUiPlanner
{
    /// <summary>The page Altinn Studio shows in a PDF service task's layout set while the PDF is generated.</summary>
    private const string WaitingPage = "ServiceTask";
    private const string LayoutSchema = "https://altinncdn.no/schemas/json/layout/layout.schema.v1.json";
    private const string SettingsSchema = "https://altinncdn.no/schemas/json/layout/layoutSettings.schema.v1.json";

    private static readonly JsonDocumentOptions _documentOptions = new()
    {
        CommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    private static readonly JsonSerializerOptions _serializerOptions = new()
    {
        WriteIndented = true,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    /// <param name="taskId">The data task whose PDF is migrated.</param>
    /// <param name="source">The task's custom PDF layout.</param>
    /// <param name="taskDataType">
    /// The task's data model from applicationmetadata.json, for when its settings have no defaultDataType.
    /// </param>
    /// <param name="displayPath">Formats a path for messages.</param>
    public static PdfTaskUi Plan(
        string taskId,
        SourceTaskPdfLayout.Custom source,
        string? taskDataType,
        Func<string, string> displayPath
    )
    {
        var settingsFile = Path.Combine(source.UiFolder, "Settings.json");
        var layoutFile = Path.Combine(source.UiFolder, "layouts", $"{source.PdfLayoutName}.json");
        if (source.PdfLayoutName.IndexOfAny(['/', '\\']) >= 0 || !File.Exists(layoutFile))
        {
            return new PdfTaskUi.Unresolved(
                $"pages.pdfLayoutName in {displayPath(settingsFile)} names the layout '{source.PdfLayoutName}', "
                    + $"which {displayPath(Path.GetDirectoryName(layoutFile) ?? source.UiFolder)} does not have, so "
                    + $"task '{taskId}' has no PDF layout to migrate. Skipped PDF service task insertion - set "
                    + "pdfLayoutName to the name of the PDF layout (or remove it) and re-run the upgrade."
            );
        }

        TextFile layoutText;
        TextFile settingsText;
        JsonNode? layout;
        JsonNode? settings;
        var reading = layoutFile;
        try
        {
            layoutText = TextFile.Read(layoutFile);
            layout = JsonNode.Parse(layoutText.Text, documentOptions: _documentOptions);
            reading = settingsFile;
            settingsText = TextFile.Read(settingsFile);
            settings = JsonNode.Parse(settingsText.Text, documentOptions: _documentOptions);
        }
        catch (Exception ex) when (ex is JsonException or DecoderFallbackException)
        {
            return new PdfTaskUi.Unresolved(
                $"{displayPath(reading)} cannot be read ({ex.Message}), so the PDF layout of task '{taskId}' "
                    + "cannot be migrated. Skipped PDF service task insertion - fix the file and re-run the upgrade."
            );
        }

        var retargeting = PdfLayoutRetargeting.Retarget(layout, source.PdfLayoutName, taskId);
        var dataType = StringValue((settings as JsonObject)?["defaultDataType"]) ?? taskDataType;
        List<string> blockers = [.. retargeting.Blockers];
        if (dataType is null)
            blockers.Add("no data model is known for the task (its settings have no defaultDataType)");
        if (
            blockers.Count > 0
            || dataType is null
            || layout is not JsonObject layoutRoot
            || settings is not JsonObject settingsRoot
        )
        {
            return new PdfTaskUi.TaskFolderCopy(UiFolderFiles.CopyOf(source.UiFolder), blockers);
        }

        // Page names are file names, which may be compared without regard to case.
        var waitingPage = string.Equals(source.PdfLayoutName, WaitingPage, StringComparison.OrdinalIgnoreCase)
            ? $"{WaitingPage}Waiting"
            : WaitingPage;

        return new PdfTaskUi.OwnLayoutSet(
            new UiFolderFiles([
                KeyValuePair.Create(
                    "Settings.json",
                    settingsText.Encode(
                        PdfTaskSettings(settingsRoot, source.PdfLayoutName, waitingPage, dataType)
                            .ToJsonString(_serializerOptions)
                    )
                ),
                KeyValuePair.Create(
                    $"layouts/{waitingPage}.json",
                    layoutText.Encode(WaitingLayout(layoutRoot).ToJsonString(_serializerOptions))
                ),
                KeyValuePair.Create(
                    $"layouts/{source.PdfLayoutName}.json",
                    layoutText.Encode(
                        LayoutJsonComments.Restore(layoutText.Text, layoutRoot.ToJsonString(_serializerOptions))
                    )
                ),
            ]),
            retargeting
        );
    }

    /// <summary>
    /// The settings Altinn Studio gives a PDF service task's layout set, keeping the source task's
    /// <c>hideAppNameInPdf</c>: a folder's own value overrides the app's for the PDF it renders.
    /// </summary>
    private static JsonObject PdfTaskSettings(
        JsonObject source,
        string pdfLayoutName,
        string waitingPage,
        string dataType
    )
    {
        var pages = new JsonObject { ["pdfLayoutName"] = pdfLayoutName, ["order"] = new JsonArray(waitingPage) };
        if ((source["pages"] as JsonObject)?["hideAppNameInPdf"] is { } hideAppNameInPdf)
            pages["hideAppNameInPdf"] = hideAppNameInPdf.DeepClone();

        return new JsonObject
        {
            ["$schema"] = StringValue(source["$schema"]) ?? SettingsSchema,
            ["pages"] = pages,
            ["defaultDataType"] = dataType,
        };
    }

    /// <summary>The waiting page Altinn Studio creates, with the texts of the frontend's own waiting view.</summary>
    private static JsonObject WaitingLayout(JsonObject pdfLayout) =>
        new()
        {
            ["$schema"] = StringValue(pdfLayout["$schema"]) ?? LayoutSchema,
            ["data"] = new JsonObject
            {
                ["layout"] = new JsonArray(
                    new JsonObject
                    {
                        ["size"] = "L",
                        ["id"] = "service-task-waiting-title",
                        ["type"] = "Heading",
                        ["textResourceBindings"] = new JsonObject { ["title"] = "service_task.waiting_title" },
                    },
                    new JsonObject
                    {
                        ["id"] = "service-task-waiting-body",
                        ["type"] = "Paragraph",
                        ["textResourceBindings"] = new JsonObject { ["title"] = "service_task.waiting_body" },
                    }
                ),
            },
        };

    private static string? StringValue(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    /// <summary>
    /// A UTF-8 file's text, and the traits a file written in its style keeps: byte order mark, line endings
    /// and trailing newline.
    /// </summary>
    private sealed record TextFile(string Text, bool HadBom)
    {
        private string LineEnding => Text.Contains("\r\n", StringComparison.Ordinal) ? "\r\n" : "\n";

        public static TextFile Read(string path)
        {
            var (text, hadBom) = Utf8TextFile.Decode(File.ReadAllBytes(path));
            return new TextFile(text, hadBom);
        }

        public byte[] Encode(string text)
        {
            text = text.Replace("\r\n", "\n", StringComparison.Ordinal);
            if (LineEnding == "\r\n")
                text = text.Replace("\n", "\r\n", StringComparison.Ordinal);
            if (Text.EndsWith('\n'))
                text += LineEnding;

            var bytes = Encoding.UTF8.GetBytes(text);
            return HadBom ? [0xEF, 0xBB, 0xBF, .. bytes] : bytes;
        }
    }
}
