using System.Xml.Serialization;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Internal.App;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for eFormidling in a process task. All properties support environment-specific values using 'env' attributes.
/// </summary>
public sealed class AltinnEFormidlingConfiguration
{
    /// <summary>
    /// Can be used to disable eFormidling in specific environments. If omitted, defaults to false (eFormidling is enabled by default).
    /// </summary>
    [XmlElement(ElementName = "disabled", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> Disabled { get; set; } = [];

    /// <summary>
    /// The organization number of the receiver of the eFormidling message. Can be omitted.
    /// </summary>
    [XmlElement(ElementName = "receiver", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> Receiver { get; set; } = [];

    /// <summary>
    /// The process identifier for the eFormidling message.
    /// </summary>
    [XmlElement(ElementName = "process", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> Process { get; set; } = [];

    /// <summary>
    /// The standard identifier for the document.
    /// </summary>
    [XmlElement(ElementName = "standard", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> Standard { get; set; } = [];

    /// <summary>
    /// The type version of the document.
    /// </summary>
    [XmlElement(ElementName = "typeVersion", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> TypeVersion { get; set; } = [];

    /// <summary>
    /// The type of the document.
    /// </summary>
    [XmlElement(ElementName = "type", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> Type { get; set; } = [];

    /// <summary>
    /// The security level for the eFormidling message.
    /// </summary>
    [XmlElement(ElementName = "securityLevel", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> SecurityLevel { get; set; } = [];

    /// <summary>
    /// Optional DPF shipment type for the eFormidling message.
    /// </summary>
    [XmlElement(ElementName = "dpfShipmentType", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> DpfShipmentType { get; set; } = [];

    /// <summary>
    /// List of data type IDs to include in the eFormidling shipment.
    /// </summary>
    [XmlElement(ElementName = "dataTypes", Namespace = "http://altinn.no/process")]
    public List<AltinnEFormidlingDataTypesConfig> DataTypes { get; set; } = [];

    internal ValidAltinnEFormidlingConfiguration Validate(HostingEnvironment env)
    {
        var validator = new ConfigValidator(env);

        // Default 'disabled' to false if not specified (eFormidling is enabled by default).
        string? disabledValue = GetOptionalConfig(Disabled, env);
        bool disabled = !string.IsNullOrWhiteSpace(disabledValue) && bool.Parse(disabledValue);

        string? receiver = GetOptionalConfig(Receiver, env);
        string process = GetRequiredConfig(Process, validator, nameof(Process));
        string standard = GetRequiredConfig(Standard, validator, nameof(Standard));
        string typeVersion = GetRequiredConfig(TypeVersion, validator, nameof(TypeVersion));
        string type = GetRequiredConfig(Type, validator, nameof(Type));
        int securityLevel = GetRequiredIntConfig(SecurityLevel, validator, nameof(SecurityLevel));
        string? dpfShipmentType = GetOptionalConfig(DpfShipmentType, env);
        List<string> dataTypes = GetDataTypesForEnvironment(env);

        validator.ThrowIfErrors();

        return new ValidAltinnEFormidlingConfiguration(
            disabled,
            receiver,
            process,
            standard,
            typeVersion,
            type,
            securityLevel,
            dpfShipmentType,
            dataTypes
        );
    }

    private static string? GetOptionalConfig(List<AltinnEnvironmentConfig> configs, HostingEnvironment env)
    {
        return AltinnTaskExtension.GetConfigForEnvironment(env, configs)?.Value;
    }

    private static string GetRequiredConfig(
        List<AltinnEnvironmentConfig> configs,
        ConfigValidator validator,
        string fieldName
    )
    {
        string? value = GetOptionalConfig(configs, validator.Environment);
        if (string.IsNullOrWhiteSpace(value))
        {
            validator.AddError($"No {fieldName} configuration found for environment {validator.Environment}");
            return string.Empty;
        }

        return value;
    }

    private static int GetRequiredIntConfig(
        List<AltinnEnvironmentConfig> configs,
        ConfigValidator validator,
        string fieldName
    )
    {
        string? value = GetOptionalConfig(configs, validator.Environment);
        if (string.IsNullOrWhiteSpace(value))
        {
            validator.AddError($"No {fieldName} configuration found for environment {validator.Environment}");
            return 0;
        }

        if (!int.TryParse(value, out int result))
        {
            validator.AddError($"{fieldName} must be a valid integer for environment {validator.Environment}");
            return 0;
        }

        return result;
    }

    private sealed class ConfigValidator
    {
        private List<string>? _errors;

        public HostingEnvironment Environment { get; }

        public ConfigValidator(HostingEnvironment environment)
        {
            Environment = environment;
        }

        public void AddError(string message)
        {
            _errors ??= [];
            _errors.Add(message);
        }

        public void ThrowIfErrors()
        {
            if (_errors is not null)
            {
                throw new ApplicationConfigException(
                    "eFormidling process task configuration is not valid: " + string.Join(",\n", _errors)
                );
            }
        }
    }

    /// <summary>
    /// Gets the data type IDs for the specified environment.
    /// Returns environment-specific configuration if available, otherwise returns global configuration.
    /// </summary>
    private List<string> GetDataTypesForEnvironment(HostingEnvironment env)
    {
        if (DataTypes.Count == 0)
            return [];

        const string globalKey = "__global__";
        Dictionary<string, List<string>> lookup = new();

        foreach (var dataTypesConfig in DataTypes)
        {
            var key = string.IsNullOrWhiteSpace(dataTypesConfig.Environment)
                ? globalKey
                : AltinnEnvironments.GetHostingEnvironment(dataTypesConfig.Environment).ToString();

            if (lookup.TryGetValue(key, out var existingList))
            {
                existingList.AddRange(dataTypesConfig.DataTypeIds);
            }
            else
            {
                lookup[key] = new List<string>(dataTypesConfig.DataTypeIds);
            }
        }

        return lookup.GetValueOrDefault(env.ToString()) ?? lookup.GetValueOrDefault(globalKey) ?? [];
    }
}

/// <summary>
/// Configuration for data types in eFormidling with environment support
/// </summary>
public class AltinnEFormidlingDataTypesConfig
{
    /// <summary>
    /// The environment this configuration applies to. If omitted, applies to all environments.
    /// </summary>
    [XmlAttribute("env")]
    public string? Environment { get; set; }

    /// <summary>
    /// List of data type IDs to include in eFormidling for this environment.
    /// </summary>
    [XmlElement(ElementName = "dataType", Namespace = "http://altinn.no/process")]
    public List<string> DataTypeIds { get; set; } = [];
}

/// <summary>
/// Validated eFormidling configuration with all required fields guaranteed to be non-null
/// </summary>
/// <param name="Disabled">Whether eFormidling should be disabled for the current environment. Only used in service task context, ignored by legacy code.</param>
/// <param name="Receiver">The organization number of the receiver. Only Norwegian organizations supported. (Can be omitted)</param>
/// <param name="Process">The process identifier for the eFormidling message</param>
/// <param name="Standard">The standard identifier for the document</param>
/// <param name="TypeVersion">The type version of the document</param>
/// <param name="Type">The type of the document</param>
/// <param name="SecurityLevel">The security level for the eFormidling message</param>
/// <param name="DpfShipmentType">Optional DPF shipment type for the eFormidling message</param>
/// <param name="DataTypes">List of data type IDs to include in the eFormidling shipment</param>
public readonly record struct ValidAltinnEFormidlingConfiguration(
    bool Disabled,
    string? Receiver,
    string Process,
    string Standard,
    string TypeVersion,
    string Type,
    int SecurityLevel,
    string? DpfShipmentType,
    List<string> DataTypes
);
