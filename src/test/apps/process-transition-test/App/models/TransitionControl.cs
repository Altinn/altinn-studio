#nullable disable
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.TransitionControl
{
    [XmlRoot(ElementName = "TransitionControl")]
    public class TransitionControl
    {
        /// <summary>Where in the Task_1 -> Task_2 transition the scenario runs: "none" (clean
        /// run, straight to Task_2), "preCommit" (in the task-ending hook, before the Storage
        /// commit) or "postCommit" (in the service task the gateway routes through, after the
        /// commit). The other levers decide what actually happens there. The field name is
        /// historical; the user-facing lever is titled "Scenario".</summary>
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

        /// <summary>What happens on the last attempt: "success" (transition completes), "failure"
        /// (terminal failure, error page; every replay fails the same way) or "failureThenSuccess"
        /// (terminal failure once, then success when the failed step is re-run via resume). Only
        /// meaningful on an error path.</summary>
        [XmlElement("endState", Order = 4)]
        [JsonProperty("endState")]
        [JsonPropertyName("endState")]
        public string endState { get; set; }

        /// <summary>What the service task does after a successful settle: "auto" (auto-advance to
        /// Task_2, today's behavior), "park" (succeed WITHOUT advancing - the process stays on
        /// the service task until an out-of-band process/next releases it, simulating a task that
        /// waits for an external callback) or "parkThenRelease" (park, then the app's own
        /// background task releases it after ~5s - the callback arriving on its own). Only
        /// meaningful on the postCommit path.</summary>
        [XmlElement("advance", Order = 5)]
        [JsonProperty("advance")]
        [JsonPropertyName("advance")]
        public string advance { get; set; }

        /// <summary>Which service task the postCommit path routes through: "default" (Task_Service,
        /// no layout - the frontend renders its built-in waiting/failure views) or "layout"
        /// (Task_ServiceLayout, which has a ui folder - the frontend renders the app's custom
        /// layout instead of the default waiting view). Only meaningful on the postCommit path.</summary>
        [XmlElement("serviceView", Order = 6)]
        [JsonProperty("serviceView")]
        [JsonPropertyName("serviceView")]
        public string serviceView { get; set; }
    }
}
