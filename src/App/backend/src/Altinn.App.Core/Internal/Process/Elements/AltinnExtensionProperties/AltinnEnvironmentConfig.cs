using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Wrapper for environment specific configuration values
/// </summary>
public sealed class AltinnEnvironmentConfig
{
    /// <summary>
    /// The environment the configuration is applicable for. An omitted value indicates validity for all environments.
    /// </summary>
    [XmlAttribute("env")]
    public string? Environment { get; set; }

    /// <summary>
    /// The configuration value
    /// </summary>
    [XmlText]
    public required string Value { get; set; }
}
