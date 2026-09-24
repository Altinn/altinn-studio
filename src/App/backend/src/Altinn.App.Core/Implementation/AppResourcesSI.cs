using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;
using Newtonsoft.Json;
using static System.Text.Json.JsonSerializer;

namespace Altinn.App.Core.Implementation;

/// <summary>
/// App implementation of the execution service needed for executing an Altinn Core Application (Functional term).
/// </summary>
/// <remarks>
/// Every method reads the current <see cref="AppFiles"/> snapshot, which is loaded into memory before the app starts
/// and replaced when the files change on disk in Development.
/// </remarks>
internal sealed class AppResourcesSI : IAppResources
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNameCaseInsensitive = true,
    };

    private static readonly JsonDocumentOptions _jsonDocumentOptions = new()
    {
        AllowTrailingCommas = true,
        CommentHandling = JsonCommentHandling.Skip,
    };

    private const string TextResourcePrefix = "resource.";
    private const string JsonExtension = ".json";

    private readonly AppFilesAccessor _appFiles;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppResourcesSI"/> class.
    /// </summary>
    /// <param name="appFiles">The app resource files.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public AppResourcesSI(AppFilesAccessor appFiles, Telemetry? telemetry = null)
    {
        _appFiles = appFiles;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    /// <remarks>
    /// The texts folder only ever holds <c>resource.{language}.json</c> files, so any other name yields null.
    /// </remarks>
    public byte[] GetText(string org, string app, string textResource)
    {
        using var activity = _telemetry?.StartGetTextActivity();
        if (
            textResource.Length > TextResourcePrefix.Length + JsonExtension.Length
            && textResource.StartsWith(TextResourcePrefix, StringComparison.Ordinal)
            && textResource.EndsWith(JsonExtension, StringComparison.Ordinal)
        )
        {
            string language = textResource[TextResourcePrefix.Length..^JsonExtension.Length];
            if (_appFiles.Current.GetTextResource(language) is { } bytes)
            {
                // Copied, as the caller owns the returned array and the snapshot must not change
                return bytes.ToArray();
            }
        }

#nullable disable
        return null;
#nullable restore
    }

    /// <inheritdoc />
    public Task<TextResource?> GetTexts(string org, string app, string language)
    {
        using var activity = _telemetry?.StartGetTextsActivity();
        if (_appFiles.Current.GetTextResource(language) is not { } bytes)
        {
            return Task.FromResult<TextResource?>(null);
        }

        TextResource textResource =
            Deserialize<TextResource>(bytes.Span, _jsonSerializerOptions)
            ?? throw new System.Text.Json.JsonException("Failed to deserialize text resource");
        textResource.Id = $"{org}-{app}-{language}";
        textResource.Org = org;
        textResource.Language = language;

        return Task.FromResult<TextResource?>(textResource);
    }

    /// <inheritdoc/>
    public string GetModelJsonSchema(string dataTypeId)
    {
        using var activity = _telemetry?.StartGetModelJsonSchemaActivity();
        return ToStringOrNull(_appFiles.Current.GetModelFiles(dataTypeId)?.JsonSchema)
            ?? throw new FileNotFoundException($"Could not find the json schema for data type '{dataTypeId}'");
    }

    /// <inheritdoc />
    public string? GetPrefillJson(string dataTypeId = "ServiceModel")
    {
        using var activity = _telemetry?.StartGetPrefillJsonActivity();
        return ToStringOrNull(_appFiles.Current.GetModelFiles(dataTypeId)?.Prefill);
    }

    /// <inheritdoc />
    public string GetClassRefForLogicDataType(string dataType)
    {
        using var activity = _telemetry?.StartGetClassRefActivity();
        ApplicationMetadata applicationMetadata = ApplicationMetadataParser.Parse(_appFiles.Current);
        string classRef = string.Empty;

        DataType? element = applicationMetadata.DataTypes.SingleOrDefault(d =>
            d.Id.Equals(dataType, StringComparison.Ordinal)
        );

        if (element != null)
        {
            classRef = element.AppLogic.ClassRef;
        }

        return classRef;
    }

    /// <inheritdoc />
    [Obsolete(
        "There is no mapping between task and layout folder anymore, all folders are named the same as the task ID.",
        error: true
    )]
    public string? GetLayoutSetsString()
    {
        throw new NotImplementedException(
            "Obsolete. There is no mapping between task and layout folder anymore, all folders are named the same as the task ID."
        );
    }

    /// <inheritdoc />
    [Obsolete(
        "There is no mapping between task and layout folder anymore, all folders are named the same as the task ID.",
        error: true
    )]
    public object? GetLayoutSets()
    {
        throw new NotImplementedException(
            "Obsolete. There is no mapping between task and layout folder anymore, all folders are named the same as the task ID."
        );
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutsInFolder or GetLayoutSettingsForFolder instead", error: true)]
    public LayoutSet? GetLayoutSetForTask(string taskId)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutsInFolder or GetLayoutSettingsForFolder instead.");
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutsInFolder instead", error: true)]
    public string GetLayoutsForSet(string layoutSetId)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutsInFolder instead.");
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutModelForFolder instead", error: true)]
    public LayoutModel GetLayoutModel(string? layoutSetId = null)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutModelForFolder instead.");
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutModelForFolder instead", error: true)]
    public LayoutModel? GetLayoutModelForTask(string taskId)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutModelForFolder instead.");
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutSettingsForFolder instead", error: true)]
    public string? GetLayoutSettingsStringForSet(string layoutSetId)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutSettingsForFolder instead.");
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutSettingsForFolder instead", error: true)]
    public LayoutSettings? GetLayoutSettingsForSet(string? layoutSetId)
    {
        throw new NotImplementedException("Obsolete. Use GetLayoutSettingsForFolder instead.");
    }

    /// <inheritdoc />
    public string GetLayoutsInFolder(string folderId)
    {
        using var activity = _telemetry?.StartGetLayoutsForSetActivity();
        Dictionary<string, object> layouts = new Dictionary<string, object>();

        if (_appFiles.Current.Ui.GetFolder(folderId) is { } folder)
        {
            foreach (var page in folder.GetLayoutPages())
            {
                if (folder.GetLayout(page) is { } bytes)
                {
                    string data = Encoding.UTF8.GetString(bytes.Span);
                    // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
                    layouts.Add(page, JsonConvert.DeserializeObject<object>(data)!);
                }
            }
        }

        return JsonConvert.SerializeObject(layouts);
    }

    /// <inheritdoc />
    public LayoutModel? GetLayoutModelForFolder(string folder)
    {
        using var activity = _telemetry?.StartGetLayoutModelActivity();
        // One snapshot for every file, so that a reload in Development cannot mix two versions of the app
        AppFiles files = _appFiles.Current;
        var ui = GetUiConfiguration(files);
        if (ui is null)
        {
            return null;
        }
        if (!ui.Folders.ContainsKey(folder))
        {
            return null;
        }

        var dataTypes = ApplicationMetadataParser.Parse(files).DataTypes;
        var layouts = ui.Folders.Select(f => LoadLayout(files, f.Key, f.Value, dataTypes)).ToList();
        return new LayoutModel(layouts, folder);
    }

    /// <inheritdoc />
    public UiConfiguration? GetUiConfiguration() => GetUiConfiguration(_appFiles.Current);

    private UiConfiguration? GetUiConfiguration(AppFiles files)
    {
        using var activity = _telemetry?.StartGetUiConfigurationActivity();
        var folders = new Dictionary<string, LayoutSettings>(StringComparer.Ordinal);

        foreach (var folderId in files.Ui.GetFolderIds())
        {
            if (DeserializeOrNull<LayoutSettings>(files.Ui.GetFolder(folderId)?.Settings) is { } settings)
            {
                folders[folderId] = settings;
            }
        }

        if (folders.Count == 0)
        {
            return null;
        }

        var globalSettings = GetGlobalUiSettings(files);
        return new UiConfiguration { Folders = folders, Settings = globalSettings };
    }

    private static UiFolderComponent LoadLayout(
        AppFiles files,
        string folderId,
        LayoutSettings settings,
        List<DataType> dataTypes
    )
    {
        var simplePageOrder = settings?.Pages?.Order;
        var groupPageOrder = settings?.Pages?.Groups?.SelectMany(g => g.Order).ToList();
        if (simplePageOrder is not null && groupPageOrder is not null)
        {
            throw new InvalidDataException(
                $"Both $Pages.Order and $Pages.Groups fields are set for layout folder {folderId}"
            );
        }
        var order = simplePageOrder ?? groupPageOrder;
        if (order is null)
        {
            throw new InvalidDataException(
                $"No $Pages.Order or $Pages.Groups field found for layout folder {folderId}"
            );
        }

        var folder = files.Ui.GetFolder(folderId);
        var pages = new List<PageComponent>();
        foreach (var page in order)
        {
            if (folder?.GetLayout(page) is not { } pageBytes)
            {
                throw new FileNotFoundException(
                    $"Layout page '{page}' is listed in the settings for layout folder '{folderId}' but does not exist"
                );
            }

            using var document = JsonDocument.Parse(pageBytes, _jsonDocumentOptions);
            pages.Add(PageComponent.Parse(document.RootElement, page, folderId));
        }

        var dataType =
            dataTypes.Find(d => d.Id == settings?.DefaultDataType)
            ?? dataTypes.Find(d => d.AppLogic?.ClassRef is not null)
            ?? throw new InvalidOperationException(
                $"Layout folder {folderId} default data type missing, or does not exist in applicationmetadata.json"
            );

        return new UiFolderComponent(pages, folderId, dataType);
    }

    /// <inheritdoc />
    public string? GetLayoutSettingsStringForFolder(string folder)
    {
        using var activity = _telemetry?.StartGetLayoutSettingsStringForSetActivity();
        return ToStringOrNull(GetSettingsBytes(folder));
    }

    /// <inheritdoc />
    public LayoutSettings? GetLayoutSettingsForFolder(string? folder)
    {
        using var activity = _telemetry?.StartGetLayoutSettingsForSetActivity();
        return DeserializeOrNull<LayoutSettings>(GetSettingsBytes(folder));
    }

    /// <inheritdoc />
    public GlobalPageSettings? GetGlobalUiSettings() => GetGlobalUiSettings(_appFiles.Current);

    private static GlobalPageSettings? GetGlobalUiSettings(AppFiles files)
    {
        string? settingsString = ToStringOrNull(files.Ui.Settings);
        if (string.IsNullOrWhiteSpace(settingsString))
        {
            return null;
        }

        return Deserialize<GlobalPageSettings>(settingsString, _jsonSerializerOptions);
    }

    /// <inheritdoc />
    public Task<string?> GetFooter()
    {
        using var activity = _telemetry?.StartGetFooterActivity();
        return Task.FromResult(ToStringOrNull(_appFiles.Current.Ui.Footer));
    }

    /// <inheritdoc />
    public string? GetValidationConfiguration(string dataTypeId)
    {
        using var activity = _telemetry?.StartGetValidationConfigurationActivity();
        return ToStringOrNull(_appFiles.Current.GetModelFiles(dataTypeId)?.ValidationConfiguration);
    }

    /// <inheritdoc />
    public string? GetXsdSchema(string dataTypeId)
    {
        return ToStringOrNull(_appFiles.Current.GetModelFiles(dataTypeId)?.XsdSchema);
    }

    /// <inheritdoc />
    public string? GetCalculationConfiguration(string dataTypeId)
    {
        using var activity = _telemetry?.StartGetCalculationConfigurationActivity();
        return ToStringOrNull(_appFiles.Current.GetModelFiles(dataTypeId)?.CalculationConfiguration);
    }

    /// <summary>
    /// The layout settings for a folder, or the global ui settings when no folder is given.
    /// </summary>
    private ReadOnlyMemory<byte>? GetSettingsBytes(string? folder)
    {
        var ui = _appFiles.Current.Ui;
        if (string.IsNullOrEmpty(folder))
        {
            return ui.Settings;
        }

        return ui.GetFolder(folder)?.Settings;
    }

    private static T? DeserializeOrNull<T>(ReadOnlyMemory<byte>? bytes) =>
        bytes is { } value ? Deserialize<T>(value.Span, _jsonSerializerOptions) : default;

    private static string? ToStringOrNull(ReadOnlyMemory<byte>? bytes) =>
        bytes is { } value ? Encoding.UTF8.GetString(value.Span) : null;
}
