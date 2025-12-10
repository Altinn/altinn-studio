namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Studio gateway env settings
    /// </summary>
    public class StudioGatewayEnvSettings
    {
        public required string BaseUrl { get; set; }

        public string GetBaseUrl(string org)
        {
            return BaseUrl.Replace("{org}", org);
        }
    }
}
