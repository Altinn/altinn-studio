using System.Xml.Serialization;
using Altinn.App.Core.Constants;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Defines the altinn properties for a task
/// </summary>
public class AltinnTaskExtension
{
    /// <summary>
    /// List of available actions for a task
    /// </summary>
    [XmlArray(ElementName = "actions", Namespace = "http://altinn.no/process", IsNullable = true)]
    [XmlArrayItem(ElementName = "action", Namespace = "http://altinn.no/process")]
    public List<AltinnAction>? AltinnActions { get; set; }

    /// <summary>
    /// Gets or sets the task type
    /// </summary>
    //[XmlElement(ElementName = "taskType", Namespace = "http://altinn.no/process/task", IsNullable = true)]
    [XmlElement("taskType", Namespace = "http://altinn.no/process")]
    public string? TaskType { get; set; }

    /// <summary>
    /// Gets or sets the configuration for signature
    /// </summary>
    [XmlElement("signatureConfig", Namespace = "http://altinn.no/process")]
    public AltinnSignatureConfiguration? SignatureConfiguration { get; set; } = new AltinnSignatureConfiguration();

    /// <summary>
    /// Gets or sets the configuration for signature
    /// </summary>
    [XmlElement("paymentConfig", Namespace = "http://altinn.no/process")]
    public AltinnPaymentConfiguration? PaymentConfiguration { get; set; } = new AltinnPaymentConfiguration();

    /// <summary>
    /// Gets or sets the configuration for PDF
    /// </summary>
    [XmlElement("pdfConfig", Namespace = "http://altinn.no/process")]
    public AltinnPdfConfiguration? PdfConfiguration { get; set; }

    /// <summary>
    /// Gets or sets the configuration for eFormidling
    /// </summary>
    [XmlElement("eFormidlingConfig", Namespace = "http://altinn.no/process")]
    public AltinnEFormidlingConfiguration? EFormidlingConfiguration { get; set; }

    /// <summary>
    /// Gets or sets the configuration for subform PDF
    /// </summary>
    [XmlElement("subformPdfConfig", Namespace = "http://altinn.no/process")]
    public AltinnSubformPdfConfiguration? SubformPdfConfiguration { get; set; }

    /// <summary>
    /// Retrieves a configuration item for given environment, in a predictable manner.
    /// Specific configurations (those specifying an environment) takes precedence over global configurations.
    /// </summary>
    /// <remarks>
    /// For usage examples, refer to <see cref="AltinnSignatureConfiguration.CorrespondenceResources"/>
    /// </remarks>
    internal static AltinnEnvironmentConfig? GetConfigForEnvironment(
        HostingEnvironment env,
        IEnumerable<AltinnEnvironmentConfig>? candidates
    )
    {
        if (candidates.IsNullOrEmpty())
            return null;

        const string globalKey = "__global__";
        Dictionary<string, AltinnEnvironmentConfig> lookup = new();
        foreach (var candidate in candidates)
        {
            var key = string.IsNullOrWhiteSpace(candidate.Environment)
                ? globalKey
                : AltinnEnvironments.GetHostingEnvironment(candidate.Environment).ToString();
            lookup[key] = candidate;
        }

        return lookup.GetValueOrDefault(env.ToString()) ?? lookup.GetValueOrDefault(globalKey);
    }
}
