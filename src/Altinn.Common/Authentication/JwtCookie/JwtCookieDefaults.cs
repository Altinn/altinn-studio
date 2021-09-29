namespace AltinnCore.Authentication.JwtCookie
{
    /// <summary>
    ///  Default values used by jwt cookie authentication.
    /// </summary>
    public static class JwtCookieDefaults
    {
        /// <summary>
        /// Default value for AuthenticationScheme property in the JwtCookieAuthenticationOptions
        /// </summary>
        public const string AuthenticationScheme = "JwtCookie";

        /// <summary>
        /// The prefix used to provide a default CookieAuthenticationOptions.CookieName
        /// </summary>
        public static readonly string CookiePrefix = ".AspNetCore.";

        /// <summary>
        /// The default value of the CookieAuthenticationOptions.ReturnUrlParameter
        /// </summary>
        public static readonly string ReturnUrlParameter = "ReturnUrl";

        /// <summary>
        /// The Name for the Altinn token cookie
        /// </summary>
        public static readonly string AltinnTokenCookie = ".ALTINNTOKEN";
    }
}
