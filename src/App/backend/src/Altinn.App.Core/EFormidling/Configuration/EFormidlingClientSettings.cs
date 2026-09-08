namespace Altinn.App.Core.EFormidling.Configuration;

/// <summary>
/// Settings for the eFormidling integrasjonspunkt client.
/// </summary>
/// <remarks>
/// Bound from the <c>EFormidlingClientSettings</c> configuration section unless the app says otherwise
/// through <see cref="IEFormidlingBuilder.WithConfig(string)"/>.
/// </remarks>
public class EFormidlingClientSettings
{
    /// <summary>
    /// Base URL of the eFormidling integrasjonspunkt API, for example
    /// <c>https://platform.altinn.no/eformidling/</c>.
    /// </summary>
    /// <remarks>
    /// A trailing slash is optional: without one the last path segment would otherwise be dropped from
    /// every request, so the client appends it. Validated at startup where an eFormidling task is
    /// enabled for the running environment.
    /// </remarks>
    public string? BaseUrl { get; set; }
}
