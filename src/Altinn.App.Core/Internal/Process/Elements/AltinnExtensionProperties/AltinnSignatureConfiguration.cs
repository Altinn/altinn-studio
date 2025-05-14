using System.Xml.Serialization;
using Altinn.App.Core.Features.Validation.Default;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for signatures in a process task
/// </summary>
public class AltinnSignatureConfiguration
{
    /// <summary>
    /// Define what taskId that should be signed for signing tasks
    /// </summary>
    [XmlArray(ElementName = "dataTypesToSign", Namespace = "http://altinn.no/process", IsNullable = true)]
    [XmlArrayItem(ElementName = "dataType", Namespace = "http://altinn.no/process")]
    public List<string> DataTypesToSign { get; set; } = [];

    /// <summary>
    /// Set what dataTypeId that should be used for storing the signature
    /// </summary>
    [XmlElement("signatureDataType", Namespace = "http://altinn.no/process")]
#nullable disable
    public string SignatureDataType { get; set; }

#nullable restore

    /// <summary>
    /// Define what signature dataypes this signature should be unique from. Users that have sign any of the signatures in the list will not be able to sign this signature
    /// </summary>
    [XmlArray(
        ElementName = "uniqueFromSignaturesInDataTypes",
        Namespace = "http://altinn.no/process",
        IsNullable = true
    )]
    [XmlArrayItem(ElementName = "dataType", Namespace = "http://altinn.no/process")]
    public List<string> UniqueFromSignaturesInDataTypes { get; set; } = [];

    /// <summary>
    /// Optionally set a signee provider that should be used for selecting signees for this signing step.
    /// The signee provider with a matching ID must be registered as a transient service in the DI container.
    ///
    /// If no provider is set, no signing rights will be delegated and no notifications to sign will be sent. Only parties granted signing rights via policy.xml will be able to sign.
    /// </summary>
    [XmlElement("signeeProviderId", Namespace = "http://altinn.no/process")]
    public string? SigneeProviderId { get; set; }

    /// <summary>
    /// Optionally set a signee context data type that should be used for storing signee contexts for this signing step.
    /// </summary>
    [XmlElement("signeeStatesDataTypeId", Namespace = "http://altinn.no/process")]
    public string? SigneeStatesDataTypeId { get; set; }

    /// <summary>
    /// Optionally set which dataTypeId that should be used for the signing task pdf. If not set, a pdf will not be generated.
    /// </summary>
    [XmlElement("signingPdfDataType", Namespace = "http://altinn.no/process")]
    public string? SigningPdfDataType { get; set; }

    /// <summary>
    /// Correspondence resource details
    /// </summary>
    [XmlElement(ElementName = "correspondenceResource", Namespace = "http://altinn.no/process")]
    public List<AltinnEnvironmentConfig> CorrespondenceResources { get; set; } = [];

    /// <summary>
    /// Sets if the default signing validator, <see cref="SigningTaskValidator"/>, should run. The default validation checks if all parties have signed the task.
    /// </summary>
    [XmlElement("runDefaultValidator", Namespace = "http://altinn.no/process")]
    public bool RunDefaultValidator { get; set; }
}
