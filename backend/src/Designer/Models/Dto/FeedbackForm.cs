using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models.Dto
{
    /// <summary>
    /// Represents a feedback form
    /// </summary>
    public class FeedbackForm
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }
    }
}
