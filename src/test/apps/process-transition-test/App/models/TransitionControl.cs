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

        /// <summary>Delay injected on every attempt, regardless of retries/end state.</summary>
        [XmlElement("delayMs", Order = 2)]
        [JsonProperty("delayMs")]
        [JsonPropertyName("delayMs")]
        public int? delayMs { get; set; }

        /// <summary>Number of transient (retryable) failures before the run settles on its
        /// end state. Only meaningful on an error path.</summary>
        [XmlElement("retries", Order = 3)]
        [JsonProperty("retries")]
        [JsonPropertyName("retries")]
        public int? retries { get; set; }

        /// <summary>What happens once the retries are spent: "success" (transition completes)
        /// or "failure" (terminal failure, error page). Only meaningful on an error path.</summary>
        [XmlElement("endState", Order = 4)]
        [JsonProperty("endState")]
        [JsonPropertyName("endState")]
        public string endState { get; set; }
    }
}
