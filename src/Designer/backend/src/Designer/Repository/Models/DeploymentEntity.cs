#nullable disable
using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Repository.Models
{
    /// <summary>
    /// Deployment entity for a db
    /// </summary>
    public class DeploymentEntity : BaseEntity
    {
        /// <summary>
        /// TagName
        /// </summary>
        [JsonProperty("tagName")]
        public string TagName { get; set; }

        /// <summary>
        /// Environment Name
        /// </summary>
        [JsonProperty("envName")]
        public string EnvName { get; set; }

        public DeploymentType DeploymentType { get; set; } = DeploymentType.Deploy;

        /// <summary>
        /// Build
        /// </summary>
        [JsonProperty("build")]
        public BuildEntity Build { get; set; }

        /// <summary>
        /// Events related to this deployment
        /// </summary>
        [JsonProperty("events")]
        public List<DeployEvent> Events { get; set; } = new List<DeployEvent>();

        private static readonly DeployEventType[] s_finalEventTypes =
        [
            DeployEventType.InstallSucceeded,
            DeployEventType.InstallFailed,
            DeployEventType.UpgradeSucceeded,
            DeployEventType.UpgradeFailed,
            DeployEventType.UninstallSucceeded,
            DeployEventType.UninstallFailed
        ];

        /// <summary>
        /// Indicates whether this deployment has reached a final state (install/upgrade succeeded or failed)
        /// </summary>
        [JsonIgnore]
        public bool HasFinalEvent => Events?.Any(e => s_finalEventTypes.Contains(e.EventType)) ?? false;
    }

    public enum DeploymentType
    {
        Deploy = 0,
        Decommission = 1
    }

    /// <summary>
    /// Deploy event entity
    /// </summary>
    public record DeployEvent
    {
        /// <summary>
        /// A human-readable description of the event
        /// </summary>
        [JsonProperty("message")]
        public string Message { get; init; }

        /// <summary>
        /// The timestamp when the event occurred (from the source)
        /// </summary>
        [JsonProperty("timestamp")]
        public DateTimeOffset Timestamp { get; init; }

        /// <summary>
        /// The type of deploy event
        /// </summary>
        [JsonProperty("eventType")]
        public DeployEventType EventType { get; init; }

        /// <summary>
        /// When the event was created in the system
        /// </summary>
        [JsonProperty("created")]
        public DateTimeOffset Created { get; init; }

        /// <summary>
        /// The origin/source of the event
        /// </summary>
        [JsonProperty("origin")]
        public DeployEventOrigin Origin { get; init; } = DeployEventOrigin.Internal;
    }

    public enum DeployEventType
    {
        PipelineScheduled,
        PipelineSucceeded,
        PipelineFailed,
        InstallSucceeded,
        InstallFailed,
        UpgradeSucceeded,
        UpgradeFailed,
        UninstallSucceeded,
        UninstallFailed
    }

    public enum DeployEventOrigin
    {
        Internal,
        Webhook,
        PollingJob
    }
}
