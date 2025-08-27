using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto
{
    /// <summary>
    /// Represents a feedback form
    /// </summary>
    public class FeedbackForm
    {
        [JsonPropertyName("answers")]
        public Dictionary<string, string> Answers { get; set; }
    }
}
