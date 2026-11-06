using System;
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// Where Designer reaches the <see href="https://github.com/Altinn/altinn-studio/tree/main/src/preview">preview
/// service</see>, which serves app preview on a domain of its own.
/// </summary>
public class PreviewServiceSettings : ISettingsMarker
{
    /// <summary>
    /// The base URL of the preview service's internal port, which only Designer reaches, such as
    /// <c>http://altinn-preview-internal</c>.
    /// </summary>
    public Uri? InternalBaseUrl { get; set; }
}
