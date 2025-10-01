using System.Text;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;
using Altinn.App.Core.Models.Layout.Components;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;

namespace Altinn.App.Core.Implementation;

/// <summary>
/// App implementation of the execution service needed for executing an Altinn Core Application (Functional term).
/// </summary>
public class AppResourcesSI : IAppResources
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        AllowTrailingCommas = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        PropertyNameCaseInsensitive = true,
    };

    private readonly AppSettings _settings;
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger _logger;
    private readonly Telemetry? _telemetry;

    /// <summary>
    /// Initializes a new instance of the <see cref="AppResourcesSI"/> class.
    /// </summary>
    /// <param name="settings">The app repository settings.</param>
    /// <param name="appMetadata">App metadata service</param>
    /// <param name="hostingEnvironment">The hosting environment</param>
    /// <param name="logger">A logger from the built in logger factory.</param>
    /// <param name="telemetry">Telemetry for traces and metrics.</param>
    public AppResourcesSI(
        IOptions<AppSettings> settings,
        IAppMetadata appMetadata,
        IWebHostEnvironment hostingEnvironment,
        ILogger<AppResourcesSI> logger,
        Telemetry? telemetry = null
    )
    {
        _settings = settings.Value;
        _appMetadata = appMetadata;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public byte[] GetText(string org, string app, string textResource)
    {
        using var activity = _telemetry?.StartGetTextActivity();
        return ReadFileContentsFromLegalPath(
            _settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder,
            textResource
        );
    }

    /// <inheritdoc />
    public async Task<TextResource?> GetTexts(string org, string app, string language)
    {
        using var activity = _telemetry?.StartGetTextsActivity();
        string pathTextsFolder = _settings.AppBasePath + _settings.ConfigurationFolder + _settings.TextFolder;
        string fullFileName = Path.Join(pathTextsFolder, $"resource.{language}.json");

        PathHelper.EnsureLegalPath(pathTextsFolder, fullFileName);

        if (!File.Exists(fullFileName))
        {
            return null;
        }

        await using FileStream fileStream = new(fullFileName, FileMode.Open, FileAccess.Read);
        TextResource textResource =
            await System.Text.Json.JsonSerializer.DeserializeAsync<TextResource>(fileStream, _jsonSerializerOptions)
            ?? throw new System.Text.Json.JsonException("Failed to deserialize text resource");
        textResource.Id = $"{org}-{app}-{language}";
        textResource.Org = org;
        textResource.Language = language;

        return textResource;
    }

    /// <inheritdoc />
    public Application GetApplication()
    {
        using var activity = _telemetry?.StartGetApplicationActivity();
        try
        {
            ApplicationMetadata applicationMetadata = _appMetadata.GetApplicationMetadata().Result;
            Application application = applicationMetadata;
            if (applicationMetadata.OnEntry != null)
            {
                application.OnEntry = new OnEntryConfig() { Show = applicationMetadata.OnEntry.Show };
            }

            return application;
        }
        catch (AggregateException ex)
        {
            throw new ApplicationConfigException("Failed to read application metadata", ex.InnerException ?? ex);
        }
    }

    /// <inheritdoc/>
    public string? GetApplicationXACMLPolicy()
    {
        using var activity = _telemetry?.StartClientGetApplicationXACMLPolicyActivity();
        try
        {
            return _appMetadata.GetApplicationXACMLPolicy().Result;
        }
        catch (AggregateException ex)
        {
            _logger.LogError(ex, "Something went wrong fetching application policy");
            return null;
        }
    }

    /// <inheritdoc/>
    public string? GetApplicationBPMNProcess()
    {
        using var activity = _telemetry?.StartClientGetApplicationBPMNProcessActivity();
        try
        {
            return _appMetadata.GetApplicationBPMNProcess().Result;
        }
        catch (AggregateException ex)
        {
            _logger.LogError(ex, "Something went wrong fetching application policy");
            return null;
        }
    }

    /// <inheritdoc/>
    public string GetModelJsonSchema(string modelId)
    {
        using var activity = _telemetry?.StartGetModelJsonSchemaActivity();
        string legalPath = $"{_settings.AppBasePath}{_settings.ModelsFolder}";
        string filename = $"{legalPath}{modelId}.{_settings.JsonSchemaFileName}";
        PathHelper.EnsureLegalPath(legalPath, filename);

        string filedata = File.ReadAllText(filename, Encoding.UTF8);

        return filedata;
    }

    /// <inheritdoc />
    public string? GetPrefillJson(string dataModelName = "ServiceModel")
    {
        using var activity = _telemetry?.StartGetPrefillJsonActivity();
        string legalPath = _settings.AppBasePath + _settings.ModelsFolder;
        string filename = legalPath + dataModelName + ".prefill.json";
        PathHelper.EnsureLegalPath(legalPath, filename);

        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }

        return filedata;
    }

    /// <inheritdoc />
    public string? GetLayoutSettingsString()
    {
        using var activity = _telemetry?.StartGetLayoutSettingsStringActivity();
        string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.FormLayoutSettingsFileName);
        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }

        return filedata;
    }

    /// <inheritdoc />
    public LayoutSettings GetLayoutSettings()
    {
        using var activity = _telemetry?.StartGetLayoutSettingsActivity();
        string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.FormLayoutSettingsFileName);
        if (File.Exists(filename))
        {
            var filedata = File.ReadAllText(filename, Encoding.UTF8);
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            LayoutSettings layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(filedata)!;
            return layoutSettings;
        }

        throw new FileNotFoundException($"Could not find layoutsettings file: {filename}");
    }

    /// <inheritdoc />
    public string GetClassRefForLogicDataType(string dataType)
    {
        using var activity = _telemetry?.StartGetClassRefActivity();
        Application application = GetApplication();
        string classRef = string.Empty;

        DataType? element = application.DataTypes.SingleOrDefault(d => d.Id.Equals(dataType, StringComparison.Ordinal));

        if (element != null)
        {
            classRef = element.AppLogic.ClassRef;
        }

        return classRef;
    }

    /// <inheritdoc />
    public string GetLayouts()
    {
        using var activity = _telemetry?.StartGetLayoutsActivity();
        Dictionary<string, object> layouts = new Dictionary<string, object>();

        // Get FormLayout.json if it exists and return it (for backwards compatibility)
        string fileName = _settings.AppBasePath + _settings.UiFolder + "FormLayout.json";
        if (File.Exists(fileName))
        {
            string fileData = File.ReadAllText(fileName, Encoding.UTF8);
            // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
            layouts.Add("FormLayout", JsonConvert.DeserializeObject<object>(fileData)!);
            return JsonConvert.SerializeObject(layouts);
        }

        string layoutsPath = _settings.AppBasePath + _settings.UiFolder + "layouts/";
        if (Directory.Exists(layoutsPath))
        {
            foreach (string file in Directory.GetFiles(layoutsPath))
            {
                string data = File.ReadAllText(file, Encoding.UTF8);
                string name = file.Replace(layoutsPath, string.Empty).Replace(".json", string.Empty);
                // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
                layouts.Add(name, JsonConvert.DeserializeObject<object>(data)!);
            }
        }

        return JsonConvert.SerializeObject(layouts);
    }

    /// <inheritdoc />
    public string GetLayoutSets()
    {
        using var activity = _telemetry?.StartGetLayoutSetsActivity();
        string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.LayoutSetsFileName);
        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }
#nullable disable
        return filedata;
#nullable restore
    }

    /// <inheritdoc />
    public LayoutSets? GetLayoutSet()
    {
        using var activity = _telemetry?.StartGetLayoutSetActivity();
        string? layoutSetsString = GetLayoutSets();
        if (layoutSetsString is not null)
        {
            return System.Text.Json.JsonSerializer.Deserialize<LayoutSets>(layoutSetsString, _jsonSerializerOptions);
        }

        return null;
    }

    /// <inheritdoc />
    public LayoutSet? GetLayoutSetForTask(string taskId)
    {
        using var activity = _telemetry?.StartGetLayoutSetsForTaskActivity();
        var sets = GetLayoutSet();
        return sets?.Sets?.Find(s => s?.Tasks?.Contains(taskId) is true);
    }

    /// <inheritdoc />
    public string GetLayoutsForSet(string layoutSetId)
    {
        using var activity = _telemetry?.StartGetLayoutsForSetActivity();
        Dictionary<string, object> layouts = new Dictionary<string, object>();

        string layoutsPath = _settings.AppBasePath + _settings.UiFolder + layoutSetId + "/layouts/";

        PathHelper.EnsureLegalPath(Path.Join(_settings.AppBasePath, _settings.UiFolder), layoutsPath);

        if (Directory.Exists(layoutsPath))
        {
            foreach (string file in Directory.GetFiles(layoutsPath))
            {
                string data = File.ReadAllText(file, Encoding.UTF8);
                string name = file.Replace(layoutsPath, string.Empty).Replace(".json", string.Empty);
                // ! TODO: this null-forgiving operator should be fixed/removed for the next major release
                layouts.Add(name, JsonConvert.DeserializeObject<object>(data)!);
            }
        }

        return JsonConvert.SerializeObject(layouts);
    }

    /// <inheritdoc />
    [Obsolete("Use GetLayoutModelForTask instead")]
    public LayoutModel GetLayoutModel(string? layoutSetId = null)
    {
        var sets = GetLayoutSet();
        if (sets is null)
        {
            throw new InvalidOperationException("No layout set found");
        }
        var set = sets.Sets.First(s => s.Id == layoutSetId);

        if (set.Tasks != null)
        {
            return GetLayoutModelForTask(set.Tasks.First())
                ?? throw new InvalidOperationException("No layout model found");
        }
        throw new InvalidOperationException("No tasks found in layout set");
    }

    /// <inheritdoc />
    public LayoutModel? GetLayoutModelForTask(string taskId)
    {
        using var activity = _telemetry?.StartGetLayoutModelActivity();
        var layoutSets = GetLayoutSet();
        if (layoutSets is null)
        {
            return null;
        }
        var dataTypes = _appMetadata.GetApplicationMetadata().Result.DataTypes;

        var layouts = layoutSets.Sets.Select(set => LoadLayout(set, dataTypes)).ToList();

        var layoutSet = GetLayoutSetForTask(taskId);
        if (layoutSet is null)
        {
            return null;
        }

        return new LayoutModel(layouts, layoutSet);
    }

    private LayoutSetComponent LoadLayout(LayoutSet layoutSet, List<DataType> dataTypes)
    {
        var settings = GetLayoutSettingsForSet(layoutSet.Id);
        var simplePageOrder = settings?.Pages?.Order;
        var groupPageOrder = settings?.Pages?.Groups?.SelectMany(g => g.Order).ToList();
        if (simplePageOrder is not null && groupPageOrder is not null)
        {
            throw new InvalidDataException(
                $"Both $Pages.Order and $Pages.Groups fields are set for layoutSet {layoutSet.Id}"
            );
        }
        var order = simplePageOrder ?? groupPageOrder;
        if (order is null)
        {
            throw new InvalidDataException(
                $"No $Pages.Order or $Pages.Groups field found for layoutSet {layoutSet.Id}"
            );
        }

        var pages = new List<PageComponent>();
        string folder = Path.Join(_settings.AppBasePath, _settings.UiFolder, layoutSet.Id, "layouts");
        foreach (var page in order)
        {
            var pagePath = Path.Join(folder, page + ".json");
            PathHelper.EnsureLegalPath(folder, pagePath);
            var pageBytes = File.ReadAllBytes(pagePath);
            using var document = JsonDocument.Parse(
                pageBytes,
                new JsonDocumentOptions() { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip }
            );
            pages.Add(PageComponent.Parse(document.RootElement, page, layoutSet.Id));
        }

        // First look at the specified data type, but
        var dataType =
            dataTypes.Find(d => d.Id == layoutSet.DataType)
            ?? dataTypes.Find(d => d.AppLogic?.ClassRef is not null)
            ?? throw new InvalidOperationException(
                $"LayoutSet {layoutSet.Id} asks for dataType {layoutSet.DataType}, but it does not exist in applicationmetadata.json"
            );
        return new LayoutSetComponent(pages, layoutSet.Id, dataType);
    }

    /// <inheritdoc />
    public string? GetLayoutSettingsStringForSet(string layoutSetId)
    {
        using var activity = _telemetry?.StartGetLayoutSettingsStringForSetActivity();
        string filename = Path.Join(
            _settings.AppBasePath,
            _settings.UiFolder,
            layoutSetId,
            _settings.FormLayoutSettingsFileName
        );

        PathHelper.EnsureLegalPath(Path.Join(_settings.AppBasePath, _settings.UiFolder), filename);

        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }

        return filedata;
    }

    /// <inheritdoc />
    public LayoutSettings? GetLayoutSettingsForSet(string? layoutSetId)
    {
        using var activity = _telemetry?.StartGetLayoutSettingsForSetActivity();
        string filename = Path.Join(
            _settings.AppBasePath,
            _settings.UiFolder,
            layoutSetId,
            _settings.FormLayoutSettingsFileName
        );

        PathHelper.EnsureLegalPath(Path.Join(_settings.AppBasePath, _settings.UiFolder), filename);

        if (File.Exists(filename))
        {
            var fileData = File.ReadAllText(filename, Encoding.UTF8);
            LayoutSettings? layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(fileData);
            return layoutSettings;
        }

        return null;
    }

    /// <inheritdoc />
    public byte[] GetRuleConfigurationForSet(string id)
    {
        using var activity = _telemetry?.StartGetRuleConfigurationForSetActivity();
        string legalPath = Path.Join(_settings.AppBasePath, _settings.UiFolder);
        string filename = Path.Join(legalPath, id, _settings.RuleConfigurationJSONFileName);

        PathHelper.EnsureLegalPath(legalPath, filename);

        return ReadFileByte(filename);
    }

    /// <inheritdoc />
    public byte[] GetRuleHandlerForSet(string id)
    {
        using var activity = _telemetry?.StartGetRuleHandlerForSetActivity();
        string legalPath = Path.Join(_settings.AppBasePath, _settings.UiFolder);
        string filename = Path.Join(legalPath, id, _settings.RuleHandlerFileName);

        PathHelper.EnsureLegalPath(legalPath, filename);

        return ReadFileByte(filename);
    }

    private static byte[] ReadFileByte(string fileName)
    {
        byte[]? filedata = null;
        if (File.Exists(fileName))
        {
            filedata = File.ReadAllBytes(fileName);
        }

#nullable disable
        return filedata;
#nullable restore
    }

    private static byte[] ReadFileContentsFromLegalPath(string legalPath, string filePath)
    {
        var fullFileName = legalPath + filePath;
        if (!PathHelper.ValidateLegalFilePath(legalPath, fullFileName))
        {
            throw new ArgumentException("Invalid argument", nameof(filePath));
        }

        if (File.Exists(fullFileName))
        {
            return File.ReadAllBytes(fullFileName);
        }

#nullable disable
        return null;
#nullable restore
    }

    /// <inheritdoc />
    public async Task<string?> GetFooter()
    {
        using var activity = _telemetry?.StartGetFooterActivity();
        string filename = Path.Join(_settings.AppBasePath, _settings.UiFolder, _settings.FooterFileName);
        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = await File.ReadAllTextAsync(filename, Encoding.UTF8);
        }

        return filedata;
    }

    /// <inheritdoc />
    public string? GetValidationConfiguration(string dataTypeId)
    {
        using var activity = _telemetry?.StartGetValidationConfigurationActivity();
        string legalPath = Path.Join(_settings.AppBasePath, _settings.ModelsFolder);
        string filename = Path.Join(legalPath, $"{dataTypeId}.{_settings.ValidationConfigurationFileName}");
        PathHelper.EnsureLegalPath(legalPath, filename);

        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }

        return filedata;
    }
}
