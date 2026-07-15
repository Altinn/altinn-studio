#nullable disable
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.TransitionControl
{
    [XmlRoot(ElementName = "TransitionControl")]
    public class TransitionControl
    {
        /// <summary>Where the Task_1 -> Task_2 transition should misbehave:
        /// "none" (clean run), "preCommit" (fail before Storage commit) or "postCommit"
        /// (fail after the instance has moved to Task_2).</summary>
        [XmlElement("path", Order = 1)]
        [JsonProperty("path")]
        [JsonPropertyName("path")]
        public string path { get; set; }

        /// <summary>Delay injected on every attempt, regardless of attempts/end state.</summary>
        [XmlElement("delayMs", Order = 2)]
        [JsonProperty("delayMs")]
        [JsonPropertyName("delayMs")]
        public int? delayMs { get; set; }

        /// <summary>How many times the engine attempts the transition. Every attempt except the last
        /// fails transiently (retryable, auto-retried); the last attempt settles on the end state.
        /// So attempts == 1 means a single attempt with no retries. Only meaningful on an error path.</summary>
        [XmlElement("attempts", Order = 3)]
        [JsonProperty("attempts")]
        [JsonPropertyName("attempts")]
        public int? attempts { get; set; }

        /// <summary>What happens on the last attempt: "success" (transition completes) or "failure"
        /// (terminal failure, error page). Only meaningful on an error path.</summary>
        [XmlElement("endState", Order = 4)]
        [JsonProperty("endState")]
        [JsonPropertyName("endState")]
        public string endState { get; set; }
    }
}
