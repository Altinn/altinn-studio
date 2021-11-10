namespace Altinn.App.Api.Models
{
    /// <summary>
    /// Simplified app settings exposing application settings needed for frontend or end user system
    /// </summary>
    public class SimpleAppSettings
    {
        /// <summary>
        /// The optional app OIDC provider.
        /// </summary>
        public string AppOidcProvider { get; set; }
    }
}
