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
    private static readonly JsonSerializerOptions _jsonSerializerOptions =
        new()
        {
            AllowTrailingCommas = true,
            ReadCommentHandling = JsonCommentHandling.Skip,
            PropertyNameCaseInsensitive = true,
        };

    private readonly AppSettings _settings;
    private readonly IAppMetadata _appMetadata;
    private readonly IWebHostEnvironment _hostingEnvironment;
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
        _hostingEnvironment = hostingEnvironment;
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

        using (FileStream fileStream = new(fullFileName, FileMode.Open, FileAccess.Read))
        {
            TextResource textResource =
                await System.Text.Json.JsonSerializer.DeserializeAsync<TextResource>(fileStream, _jsonSerializerOptions)
                ?? throw new System.Text.Json.JsonException("Failed to deserialize text resource");
            textResource.Id = $"{org}-{app}-{language}";
            textResource.Org = org;
            textResource.Language = language;

            return textResource;
        }
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

        DataType? element = application.DataTypes.SingleOrDefault(d => d.Id.Equals(dataType));

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
        return sets?.Sets?.FirstOrDefault(s => s?.Tasks?.Contains(taskId) ?? false);
    }

    /// <inheritdoc />
    public string GetLayoutsForSet(string layoutSetId)
    {
        using var activity = _telemetry?.StartGetLayoutsForSetActivity();
        Dictionary<string, object> layouts = new Dictionary<string, object>();

        string layoutsPath = _settings.AppBasePath + _settings.UiFolder + layoutSetId + "/layouts/";
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
    public LayoutModel GetLayoutModel(string? layoutSetId = null)
    {
        using var activity = _telemetry?.StartGetLayoutModelActivity();
        string folder = Path.Join(_settings.AppBasePath, _settings.UiFolder, layoutSetId, "layouts");
        var order = GetLayoutSettingsForSet(layoutSetId)?.Pages?.Order;
        if (order is null)
        {
            throw new InvalidDataException(
                "No $Pages.Order field found" + (layoutSetId is null ? "" : $" for layoutSet {layoutSetId}")
            );
        }

        var layoutModel = new LayoutModel();
        foreach (var page in order)
        {
            var pageBytes = File.ReadAllBytes(Path.Join(folder, page + ".json"));
            // Set the PageName using AsyncLocal before deserializing.
            PageComponentConverter.SetAsyncLocalPageName(page);
            layoutModel.Pages[page] =
                System.Text.Json.JsonSerializer.Deserialize<PageComponent>(
                    pageBytes.RemoveBom(),
                    _jsonSerializerOptions
                ) ?? throw new InvalidDataException(page + ".json is \"null\"");
        }

        return layoutModel;
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
        if (File.Exists(filename))
        {
            string? filedata = null;
            filedata = File.ReadAllText(filename, Encoding.UTF8);
            LayoutSettings? layoutSettings = JsonConvert.DeserializeObject<LayoutSettings>(filedata);
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

    private byte[] ReadFileByte(string fileName)
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

    private byte[] ReadFileContentsFromLegalPath(string legalPath, string filePath)
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
    public string? GetValidationConfiguration(string modelId)
    {
        using var activity = _telemetry?.StartGetValidationConfigurationActivity();
        string legalPath = $"{_settings.AppBasePath}{_settings.ModelsFolder}";
        string filename = $"{legalPath}{modelId}.{_settings.ValidationConfigurationFileName}";
        PathHelper.EnsureLegalPath(legalPath, filename);

        string? filedata = null;
        if (File.Exists(filename))
        {
            filedata = File.ReadAllText(filename, Encoding.UTF8);
        }

        return filedata;
    }
}
