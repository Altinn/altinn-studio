using Microsoft.AspNetCore.Mvc;

using System;
using System.Runtime.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Introspective request model
    /// </summary>
    [DataContract]
    public class IntrospectionRequest
    {
        /// <summary>
        /// Gets or sets the token
        /// </summary>
        [FromForm(Name = "token")]
        public string Token { get; set; }

        /// <summary>
        /// Gets or sets the token type hint
        /// </summary>
        [FromForm(Name = "token_type_hint")]
        public string TokenTypeHint { get; set; }
    }
}
