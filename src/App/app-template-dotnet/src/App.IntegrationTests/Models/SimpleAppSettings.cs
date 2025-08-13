namespace App.IntegrationTestsRef.Models
{
    /// <summary>
    /// Simplified app settings exposing application settings needed for frontend or end user system
    /// </summary>
    /// <remarks>
    /// This class was originally a part of the app template, but was moved here when it was replaced with FrontEndSettings.
    /// We kept it here in the test project to proove backwards compatibility.
    /// </remarks>
    public class SimpleAppSettings
    {
        /// <summary>
        /// The optional app OIDC provider.
        /// </summary>
        public string AppOidcProvider { get; set; }
    }
}
