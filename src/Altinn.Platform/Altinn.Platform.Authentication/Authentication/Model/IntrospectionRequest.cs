namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Introspective request model
    /// </summary>
    public class IntrospectionRequest
    {
        /// <summary>
        /// Gets or sets the token
        /// </summary>
        public string Token { get; set; }

        /// <summary>
        /// Gets or sets the token type hint
        /// </summary>
        public string TokenTypeHint { get; set; }
    }
}
