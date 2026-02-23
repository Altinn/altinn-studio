using System.Text.Json;

namespace Altinn.Studio.Cli.Upgrade.v8Tov10.RuleConfiguration.DataProcessingRules;

/// <summary>
/// Model representing a layout set from layout-sets.json
/// </summary>
internal sealed class LayoutSet
{
    public string? Id { get; set; }
    public string? DataType { get; set; }
}

/// <summary>
/// Model representing layout-sets.json file
/// </summary>
internal sealed class LayoutSetsConfiguration
{
    public List<LayoutSet>? Sets { get; set; }
}

/// <summary>
/// Model representing a data type from applicationmetadata.json
/// </summary>
internal sealed class DataTypeMetadata
{
    public string? Id { get; set; }
    public AppLogic? AppLogic { get; set; }
}

internal sealed class AppLogic
{
    public string? ClassRef { get; set; }
}

/// <summary>
/// Model representing applicationmetadata.json file
/// </summary>
internal sealed class ApplicationMetadata
{
    public List<DataTypeMetadata>? DataTypes { get; set; }
}

/// <summary>
/// Resolves data model information for layout sets
/// </summary>
internal sealed class DataModelResolver
{
    private static readonly JsonSerializerOptions s_jsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly string _appBasePath;
    private LayoutSetsConfiguration? _layoutSetsConfig;
    private ApplicationMetadata? _applicationMetadata;

    public DataModelResolver(string appBasePath)
    {
        _appBasePath = appBasePath;
    }

    /// <summary>
    /// Load configuration files
    /// </summary>
    public void LoadConfiguration()
    {
        var layoutSetsPath = Path.Combine(_appBasePath, "App", "ui", "layout-sets.json");
        var appMetadataPath = Path.Combine(_appBasePath, "App", "config", "applicationmetadata.json");
        if (File.Exists(layoutSetsPath))
        {
            var json = File.ReadAllText(layoutSetsPath);
            _layoutSetsConfig = JsonSerializer.Deserialize<LayoutSetsConfiguration>(json, s_jsonOptions);
        }

        if (File.Exists(appMetadataPath))
        {
            var json = File.ReadAllText(appMetadataPath);
            _applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(json, s_jsonOptions);
        }
    }

    /// <summary>
    /// Get the data type name for a layout set
    /// </summary>
    public string? GetDataTypeForLayoutSet(string layoutSetName)
    {
        if (_layoutSetsConfig?.Sets == null)
        {
            return null;
        }

        var layoutSet = _layoutSetsConfig.Sets.FirstOrDefault(s =>
            s.Id?.Equals(layoutSetName, StringComparison.OrdinalIgnoreCase) == true
        );

        return layoutSet?.DataType;
    }

    /// <summary>
    /// Get the full class reference (namespace + class name) for a data type
    /// </summary>
    public string? GetClassRefForDataType(string dataType)
    {
        if (_applicationMetadata?.DataTypes == null)
        {
            return null;
        }

        var dataTypeMetadata = _applicationMetadata.DataTypes.FirstOrDefault(dt =>
            dt.Id?.Equals(dataType, StringComparison.OrdinalIgnoreCase) == true
        );

        return dataTypeMetadata?.AppLogic?.ClassRef;
    }

    /// <summary>
    /// Get the class name (without namespace) for a data type
    /// </summary>
    public string? GetClassNameForDataType(string dataType)
    {
        var classRef = GetClassRefForDataType(dataType);
        if (classRef == null)
        {
            return null;
        }

        // Extract class name from fully qualified name
        // e.g., "Altinn.App.Models.Model.Model" -> "Model"
        var parts = classRef.Split('.');
        return parts.Length > 0 ? parts[^1] : null;
    }

    /// <summary>
    /// Get the namespace for a data type
    /// </summary>
    public string? GetNamespaceForDataType(string dataType)
    {
        var classRef = GetClassRefForDataType(dataType);
        if (classRef == null)
        {
            return null;
        }

        // Extract namespace from fully qualified name
        // e.g., "Altinn.App.Models.Model.Model" -> "Altinn.App.Models.Model"
        var lastDotIndex = classRef.LastIndexOf('.');
        return lastDotIndex > 0 ? classRef[..lastDotIndex] : null;
    }

    /// <summary>
    /// Get complete data model information for a layout set
    /// </summary>
    public DataModelInfo? GetDataModelInfo(string layoutSetName)
    {
        var dataType = GetDataTypeForLayoutSet(layoutSetName);
        if (dataType == null)
        {
            return null;
        }

        var classRef = GetClassRefForDataType(dataType);
        if (classRef == null)
        {
            return null;
        }

        return new DataModelInfo
        {
            DataType = dataType,
            FullClassRef = classRef,
            ClassName = GetClassNameForDataType(dataType),
            Namespace = GetNamespaceForDataType(dataType),
        };
    }
}

/// <summary>
/// Complete information about a data model
/// </summary>
internal sealed class DataModelInfo
{
    public required string DataType { get; init; }
    public required string FullClassRef { get; init; }
    public string? ClassName { get; init; }
    public string? Namespace { get; init; }
}
