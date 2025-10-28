namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Grafana env settings
    /// </summary>
    public class GrafanaEnvSettings
    {
        public string BaseUri { get; set; }
        public string Token { get; set; }

        public string GetBaseUri(string org)
        {
            return BaseUri.Replace("{org}", org);
        }
    }
}
