namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Introspection response object
    /// </summary>
    public class IntrospectionResponse
    {
        /// <summary>
        /// Gets or sects the active property indicating if the request token was valid
        /// </summary>
        public bool Active { get; set; }

        /// <summary>
        /// Gets or sets the issuer of the validated request token.
        /// </summary>
        public string Iss { get; set; }
    }
}
