using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// Where Designer reaches the core-operator's run API, and the token it sends there.
/// </summary>
internal sealed class OperatorSettings : ISettingsMarker
{
    /// <summary>
    /// Where the kubelet keeps the projected ServiceAccount token with the audience <c>core-operator</c>.
    /// </summary>
    public const string DefaultTokenPath = "/var/run/secrets/core-operator/token";

    /// <summary>
    /// The run API, such as <c>http://core-operator.core-operator.svc.cluster.local:8080</c>. Designer registers
    /// no <see cref="IOperatorClient"/> while it is empty.
    /// </summary>
    public string BaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// The file that holds the projected ServiceAccount token.
    /// </summary>
    public string TokenPath { get; set; } = DefaultTokenPath;
}
