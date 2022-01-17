namespace Altinn.App.Services.Constants
{
    /// <summary>
    /// app token
    /// </summary>
    public static class General
    {
        /// <summary>
        /// app token name
        /// </summary>
        public const string AppTokenName = "AltinnToken";

        /// <summary>
        /// The name of the authorization token
        /// </summary>
        public const string AuthorizationTokenHeaderName = "Authorization";

        /// <summary>
        /// The name of the cookie used for asp authentication in runtime application
        /// </summary>
        public const string RuntimeCookieName = "AltinnStudioRuntime";

        /// <summary>
        /// The name of the cookie used for asp authentication in designer application
        /// </summary>
        public const string DesignerCookieName = "AltinnStudioDesigner";

        /// <summary>
        /// Header key for API management subscription key
        /// </summary>
        public const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";

        /// <summary>
        /// Header key for access token for eFormidling Integration Point 
        /// </summary>
        public const string EFormidlingAccessTokenHeaderName = "AltinnIntegrationPointToken";
    }
}
