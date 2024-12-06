#nullable enable
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.Studio.Designer.Models.Dto
{
    public class AltinnProblemDetails : ProblemDetails
    {
        /// <summary>
        /// Gets or sets the error code.
        /// </summary>
        [JsonPropertyName("code")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ErrorCode { get; set; }
    }
}
