using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Gateway settings
    /// </summary>
    public class GatewaySettings : ISettingsMarker
    {
        public required string BaseUrl { get; set; }

        public string GetBaseUrl(string org, string env)
        {
            return BaseUrl.Replace("{org}", org).Replace("{env}", env == "prod" ? "" : $".{env}");
        }
    }
}
