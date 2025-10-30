namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Studio gateway env settings
    /// </summary>
    public class StudioGatewayEnvSettings
    {
        public string BaseUri { get; set; }
        public string Token { get; set; }

        public string GetBaseUri(string org)
        {
            return BaseUri.Replace("{org}", org);
        }
    }
}
