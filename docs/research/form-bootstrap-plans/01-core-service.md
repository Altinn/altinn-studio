# Phase 1: Backend Service

## Objective

Create the backend service that:

1. Analyzes layouts to extract referenced data types and static options
2. Aggregates all form data into a single response
3. Handles parallel data fetching

---

## Tasks

### 1.1 Create Response Models

**Location**: `src/Altinn.App.Core/Features/Bootstrap/Models/`

#### FormBootstrapResponse.cs

```csharp
using System.Text.Json.Serialization;
using Altinn.App.Core.Models.Validation;

namespace Altinn.App.Core.Features.Bootstrap.Models;

public class FormBootstrapResponse
{
    [JsonPropertyName("layouts")]
    public required object Layouts { get; init; }

    [JsonPropertyName("layoutSettings")]
    public required object? LayoutSettings { get; init; }

    [JsonPropertyName("dataModels")]
    public required Dictionary<string, DataModelInfo> DataModels { get; init; }

    [JsonPropertyName("staticOptions")]
    public required Dictionary<string, List<AppOption>> StaticOptions { get; init; }

    [JsonPropertyName("validationIssues")]
    public List<ValidationIssueWithSource>? ValidationIssues { get; init; }

    [JsonPropertyName("metadata")]
    public required FormBootstrapMetadata Metadata { get; init; }
}

public class DataModelInfo
{
    [JsonPropertyName("schema")]
    public required object Schema { get; init; }

    [JsonPropertyName("initialData")]
    public required object InitialData { get; init; }

    [JsonPropertyName("dataElementId")]
    public string? DataElementId { get; init; }

    [JsonPropertyName("isWritable")]
    public required bool IsWritable { get; init; }

    [JsonPropertyName("expressionValidationConfig")]
    public object? ExpressionValidationConfig { get; init; }
}

public class FormBootstrapMetadata
{
    [JsonPropertyName("layoutSetId")]
    public required string LayoutSetId { get; init; }

    [JsonPropertyName("defaultDataType")]
    public required string DefaultDataType { get; init; }

    [JsonPropertyName("isSubform")]
    public bool IsSubform { get; init; }

    [JsonPropertyName("isPdf")]
    public bool IsPdf { get; init; }
}
```

---

### 1.2 Create Layout Analysis Service

**Location**: `src/Altinn.App.Core/Features/Bootstrap/LayoutAnalysisService.cs`

This service parses layouts to find data types and static options. The backend already has layout parsing infrastructure, but we need targeted extraction.

#### Interface

```csharp
namespace Altinn.App.Core.Features.Bootstrap;

public interface ILayoutAnalysisService
{
    /// <summary>
    /// Get all data types referenced in dataModelBindings across all layouts.
    /// </summary>
    HashSet<string> GetReferencedDataTypes(object layoutsJson, string defaultDataType);

    /// <summary>
    /// Get all optionsId values that can be fetched statically
    /// (have optionsId, no mapping property, static queryParameters).
    /// </summary>
    HashSet<string> GetStaticOptionIds(object layoutsJson);
}
```

#### Implementation

```csharp
using System.Text.Json;

internal sealed class LayoutAnalysisService : ILayoutAnalysisService
{
    public HashSet<string> GetReferencedDataTypes(object layoutsJson, string defaultDataType)
    {
        var dataTypes = new HashSet<string> { defaultDataType };

        // Parse JSON and traverse looking for dataModelBindings
        var json = layoutsJson is JsonElement element
            ? element
            : JsonSerializer.SerializeToElement(layoutsJson);

        TraverseForDataTypes(json, dataTypes);
        return dataTypes;
    }

    public HashSet<string> GetStaticOptionIds(object layoutsJson)
    {
        var optionIds = new HashSet<string>();

        var json = layoutsJson is JsonElement element
            ? element
            : JsonSerializer.SerializeToElement(layoutsJson);

        TraverseForOptions(json, optionIds);
        return optionIds;
    }

    private void TraverseForDataTypes(JsonElement element, HashSet<string> dataTypes)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            // Check for dataModelBindings
            if (element.TryGetProperty("dataModelBindings", out var bindings))
            {
                foreach (var binding in bindings.EnumerateObject())
                {
                    if (binding.Value.ValueKind == JsonValueKind.Object &&
                        binding.Value.TryGetProperty("dataType", out var dataType) &&
                        dataType.ValueKind == JsonValueKind.String)
                    {
                        dataTypes.Add(dataType.GetString()!);
                    }
                }
            }

            // Recurse into all properties
            foreach (var prop in element.EnumerateObject())
            {
                TraverseForDataTypes(prop.Value, dataTypes);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in element.EnumerateArray())
            {
                TraverseForDataTypes(item, dataTypes);
            }
        }
    }

    private void TraverseForOptions(JsonElement element, HashSet<string> optionIds)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            // Check if this looks like a component with optionsId
            if (element.TryGetProperty("optionsId", out var optionsId) &&
                optionsId.ValueKind == JsonValueKind.String)
            {
                // Exclude if has mapping property
                if (!element.TryGetProperty("mapping", out _))
                {
                    // Check queryParameters are static (if present)
                    if (!element.TryGetProperty("queryParameters", out var queryParams) ||
                        AreQueryParamsStatic(queryParams))
                    {
                        optionIds.Add(optionsId.GetString()!);
                    }
                }
            }

            // Also scan for optionLabel expressions: ["optionLabel", "someId", ...]
            ScanForOptionLabelExpressions(element, optionIds);

            // Recurse
            foreach (var prop in element.EnumerateObject())
            {
                TraverseForOptions(prop.Value, optionIds);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
        {
            // Check if this is an optionLabel expression
            if (IsOptionLabelExpression(element, out var optionsIdFromExpr))
            {
                optionIds.Add(optionsIdFromExpr);
            }

            foreach (var item in element.EnumerateArray())
            {
                TraverseForOptions(item, optionIds);
            }
        }
    }

    private bool AreQueryParamsStatic(JsonElement queryParams)
    {
        if (queryParams.ValueKind != JsonValueKind.Object)
            return false;

        foreach (var param in queryParams.EnumerateObject())
        {
            var kind = param.Value.ValueKind;
            // Only allow primitive values, not arrays (expressions)
            if (kind != JsonValueKind.String &&
                kind != JsonValueKind.Number &&
                kind != JsonValueKind.True &&
                kind != JsonValueKind.False &&
                kind != JsonValueKind.Null)
            {
                return false;
            }
        }
        return true;
    }

    private bool IsOptionLabelExpression(JsonElement array, out string optionsId)
    {
        optionsId = string.Empty;

        if (array.GetArrayLength() >= 2)
        {
            var first = array[0];
            if (first.ValueKind == JsonValueKind.String && first.GetString() == "optionLabel")
            {
                var second = array[1];
                if (second.ValueKind == JsonValueKind.String)
                {
                    optionsId = second.GetString()!;
                    return true;
                }
            }
        }
        return false;
    }

    private void ScanForOptionLabelExpressions(JsonElement obj, HashSet<string> optionIds)
    {
        // Already handled in TraverseForOptions via array check
    }
}
```

---

### 1.3 Create Form Bootstrap Service

**Location**: `src/Altinn.App.Core/Features/Bootstrap/FormBootstrapService.cs`

```csharp
using Altinn.App.Core.Features.Bootstrap.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Bootstrap;

public interface IFormBootstrapService
{
    Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string? layoutSetIdOverride,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default);

    Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string layoutSetId,
        string language,
        CancellationToken cancellationToken = default);
}

internal sealed class FormBootstrapService : IFormBootstrapService
{
    private readonly IAppResources _appResources;
    private readonly IAppMetadata _appMetadata;
    private readonly ILayoutAnalysisService _layoutAnalysis;
    private readonly IAppOptionsFileHandler _optionsFileHandler;
    private readonly IDataClient _dataClient;
    private readonly IValidationService _validationService;
    private readonly IPrefill _prefillService;
    private readonly IAppModel _appModel;
    private readonly ILogger<FormBootstrapService> _logger;

    public FormBootstrapService(
        IAppResources appResources,
        IAppMetadata appMetadata,
        ILayoutAnalysisService layoutAnalysis,
        IAppOptionsFileHandler optionsFileHandler,
        IDataClient dataClient,
        IValidationService validationService,
        IPrefill prefillService,
        IAppModel appModel,
        ILogger<FormBootstrapService> logger)
    {
        _appResources = appResources;
        _appMetadata = appMetadata;
        _layoutAnalysis = layoutAnalysis;
        _optionsFileHandler = optionsFileHandler;
        _dataClient = dataClient;
        _validationService = validationService;
        _prefillService = prefillService;
        _appModel = appModel;
        _logger = logger;
    }

    public async Task<FormBootstrapResponse> GetInstanceFormBootstrap(
        Instance instance,
        string? layoutSetIdOverride,
        string? dataElementIdOverride,
        bool isPdf,
        string language,
        CancellationToken cancellationToken = default)
    {
        // 1. Determine layout set
        var layoutSetId = layoutSetIdOverride ?? GetLayoutSetFromProcess(instance);
        var defaultDataType = GetDefaultDataType(layoutSetId);
        var isSubform = layoutSetIdOverride != null;

        // 2. Load layouts (needed for analysis)
        var layouts = _appResources.GetLayoutsForSet(layoutSetId);
        var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSetId);

        // 3. Analyze layouts
        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layouts, defaultDataType);
        var staticOptionIds = _layoutAnalysis.GetStaticOptionIds(layouts);

        // 4. Load everything in parallel
        var dataModelsTask = LoadDataModels(
            instance,
            referencedDataTypes,
            dataElementIdOverride,
            isPdf,
            cancellationToken);
        var optionsTask = LoadStaticOptions(staticOptionIds, language);
        var validationTask = isPdf
            ? Task.FromResult<List<ValidationIssueWithSource>?>(null)
            : RunValidation(instance, language, cancellationToken);

        await Task.WhenAll(dataModelsTask, optionsTask, validationTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            LayoutSettings = layoutSettings,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = await validationTask,
            Metadata = new FormBootstrapMetadata
            {
                LayoutSetId = layoutSetId,
                DefaultDataType = defaultDataType,
                IsSubform = isSubform,
                IsPdf = isPdf,
            },
        };
    }

    public async Task<FormBootstrapResponse> GetStatelessFormBootstrap(
        string layoutSetId,
        string language,
        CancellationToken cancellationToken = default)
    {
        var defaultDataType = GetDefaultDataType(layoutSetId);

        // Load layouts
        var layouts = _appResources.GetLayoutsForSet(layoutSetId);
        var layoutSettings = _appResources.GetLayoutSettingsForSet(layoutSetId);

        // Analyze
        var referencedDataTypes = _layoutAnalysis.GetReferencedDataTypes(layouts, defaultDataType);
        var staticOptionIds = _layoutAnalysis.GetStaticOptionIds(layouts);

        // Load in parallel
        var dataModelsTask = LoadStatelessDataModels(referencedDataTypes, cancellationToken);
        var optionsTask = LoadStaticOptions(staticOptionIds, language);

        await Task.WhenAll(dataModelsTask, optionsTask);

        return new FormBootstrapResponse
        {
            Layouts = layouts,
            LayoutSettings = layoutSettings,
            DataModels = await dataModelsTask,
            StaticOptions = await optionsTask,
            ValidationIssues = null, // No validation for stateless
            Metadata = new FormBootstrapMetadata
            {
                LayoutSetId = layoutSetId,
                DefaultDataType = defaultDataType,
                IsSubform = false,
                IsPdf = false,
            },
        };
    }

    private async Task<Dictionary<string, DataModelInfo>> LoadDataModels(
        Instance instance,
        HashSet<string> dataTypes,
        string? specificDataElementId,
        bool isPdf,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, DataModelInfo>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        var tasks = dataTypes.Select(async dataType =>
        {
            var dataTypeDef = appMetadata.DataTypes.FirstOrDefault(dt => dt.Id == dataType);
            if (dataTypeDef?.AppLogic?.ClassRef == null)
            {
                _logger.LogWarning("Data type {DataType} missing classRef", dataType);
                return (dataType, (DataModelInfo?)null);
            }

            // Find data element
            var dataElement = specificDataElementId != null
                ? instance.Data.FirstOrDefault(d => d.Id == specificDataElementId)
                : instance.Data.FirstOrDefault(d => d.DataType == dataType);

            if (dataElement == null)
            {
                _logger.LogWarning("No data element for type {DataType}", dataType);
                return (dataType, (DataModelInfo?)null);
            }

            // Load in parallel
            var schemaTask = GetSchemaAsync(dataType);
            var dataTask = GetFormDataAsync(instance, dataElement, cancellationToken);
            var validationConfigTask = isPdf || dataElement.Locked
                ? Task.FromResult<object?>(null)
                : GetValidationConfigAsync(dataType);

            await Task.WhenAll(schemaTask, dataTask, validationConfigTask);

            return (dataType, (DataModelInfo?)new DataModelInfo
            {
                Schema = await schemaTask,
                InitialData = await dataTask,
                DataElementId = dataElement.Id,
                IsWritable = !dataElement.Locked,
                ExpressionValidationConfig = await validationConfigTask,
            });
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (dataType, info) in results)
        {
            if (info != null)
            {
                result[dataType] = info;
            }
        }

        return result;
    }

    private async Task<Dictionary<string, DataModelInfo>> LoadStatelessDataModels(
        HashSet<string> dataTypes,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, DataModelInfo>();
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        var tasks = dataTypes.Select(async dataType =>
        {
            var dataTypeDef = appMetadata.DataTypes.FirstOrDefault(dt => dt.Id == dataType);
            if (dataTypeDef?.AppLogic?.ClassRef == null)
            {
                return (dataType, (DataModelInfo?)null);
            }

            var schemaTask = GetSchemaAsync(dataType);
            var dataTask = GetDefaultFormDataAsync(dataType);
            var validationConfigTask = GetValidationConfigAsync(dataType);

            await Task.WhenAll(schemaTask, dataTask, validationConfigTask);

            return (dataType, (DataModelInfo?)new DataModelInfo
            {
                Schema = await schemaTask,
                InitialData = await dataTask,
                DataElementId = null,
                IsWritable = true,
                ExpressionValidationConfig = await validationConfigTask,
            });
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (dataType, info) in results)
        {
            if (info != null)
            {
                result[dataType] = info;
            }
        }

        return result;
    }

    private async Task<Dictionary<string, List<AppOption>>> LoadStaticOptions(
        HashSet<string> optionIds,
        string language)
    {
        var result = new Dictionary<string, List<AppOption>>();

        var tasks = optionIds.Select(async optionsId =>
        {
            try
            {
                var options = await _optionsFileHandler.ReadOptionsFromFileAsync(optionsId);
                return (optionsId, options);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load options {OptionsId}", optionsId);
                return (optionsId, (List<AppOption>?)null);
            }
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (optionsId, options) in results)
        {
            if (options != null)
            {
                result[optionsId] = options;
            }
        }

        return result;
    }

    // Helper methods for loading individual pieces...
    private string GetLayoutSetFromProcess(Instance instance) { /* ... */ }
    private string GetDefaultDataType(string layoutSetId) { /* ... */ }
    private Task<object> GetSchemaAsync(string dataType) { /* ... */ }
    private Task<object> GetFormDataAsync(Instance instance, DataElement element, CancellationToken ct) { /* ... */ }
    private Task<object> GetDefaultFormDataAsync(string dataType) { /* ... */ }
    private Task<object?> GetValidationConfigAsync(string dataType) { /* ... */ }
    private Task<List<ValidationIssueWithSource>?> RunValidation(Instance instance, string language, CancellationToken ct) { /* ... */ }
}
```

---

### 1.4 Register Services

**Location**: `src/Altinn.App.Core/Extensions/ServiceCollectionExtensions.cs`

```csharp
services.AddTransient<ILayoutAnalysisService, LayoutAnalysisService>();
services.AddTransient<IFormBootstrapService, FormBootstrapService>();
```

---

## Acceptance Criteria

- [ ] Response models compile and serialize correctly
- [ ] Layout analysis extracts all data types from layouts
- [ ] Layout analysis identifies static options (no mapping, static queryParameters)
- [ ] Layout analysis finds optionLabel expressions
- [ ] Service loads all data in parallel where possible
- [ ] Service handles missing data gracefully (logs warning, continues)

---

## Notes

- Return raw JSON as `object` to avoid re-serialization overhead
- Don't cache internally - let HTTP layer handle caching
- Be defensive - log warnings for missing data but don't fail entirely
