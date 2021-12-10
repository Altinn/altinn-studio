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
        /// token_type_hint
        /// </summary>
        public string TokenTypeHint { get; set; }
    }
}
