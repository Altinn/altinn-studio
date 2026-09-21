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

        /// <summary>Which service task the postCommit path routes through: "default" (Task_Service,
        /// no layout - the frontend renders its built-in waiting/failure views) or "layout"
        /// (Task_ServiceLayout, which has a ui folder - the frontend renders the app's custom
        /// layout instead of the default waiting view). Only meaningful on the postCommit path.</summary>
        [XmlElement("serviceView", Order = 6)]
        [JsonProperty("serviceView")]
        [JsonPropertyName("serviceView")]
        public string serviceView { get; set; }

        /// <summary>How many times the service task DEFERS before it settles. A deferral is not a
        /// failure: the step reports "ran fine, the outcome isn't here yet", the engine parks the
        /// workflow in Waiting and re-runs the task after deferDelayMs. Distinct from `attempts`,
        /// which forces retryable FAILURES. 0 means no deferrals. Only meaningful on the postCommit
        /// path.</summary>
        [XmlElement("deferrals", Order = 7)]
        [JsonProperty("deferrals")]
        [JsonPropertyName("deferrals")]
        public int? deferrals { get; set; }

        /// <summary>How long the engine waits between deferrals. The service task picks this per
        /// re-check; the step's wait budget caps the total.</summary>
        /// <summary>Which task the process moves on to after the service task on the postCommit
        /// path: "task2" (a data task, the default) or "sign" (Task_Sign, a signing task). A
        /// signing task renders through its ui folder, so a session still parked on the service
        /// task's url when the process moves on exercises the task-type lookup for a url that
        /// names a different task than the current one.</summary>
        [XmlElement("next", Order = 9)]
        [JsonProperty("next")]
        [JsonPropertyName("next")]
        public string next { get; set; }

        [XmlElement("deferDelayMs", Order = 8)]
        [JsonProperty("deferDelayMs")]
        [JsonPropertyName("deferDelayMs")]
        public int? deferDelayMs { get; set; }
    }
}
