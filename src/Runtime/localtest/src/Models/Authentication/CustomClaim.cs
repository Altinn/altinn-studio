using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    public class CustomClaim
    {
        /// <summary>
        /// Gets or sets the claim type, E.g. custom:claim
        /// </summary>
        [JsonPropertyName("type")]
        public string Type { get; set; }

        /// <summary>
        /// Gets or sets the claim value, E.g. customValue
        /// </summary>
        [JsonPropertyName("value")]
        public string Value { get; set; }

        /// <summary>
        /// Gets or sets the value type for the claim, E.g. http://www.w3.org/2001/XMLSchema#string
        /// See System.Security.Claims.ClaimValueTypes for more value types
        /// </summary>
        [JsonPropertyName("valueType")]
        public string ValueType { get; set; }
    }
}
