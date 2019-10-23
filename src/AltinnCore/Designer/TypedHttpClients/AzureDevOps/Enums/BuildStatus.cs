using System.Runtime.Serialization;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums
{
    /// <summary>
    /// The Azure DevOps Build Status
    /// https://docs.microsoft.com/en-us/rest/api/azure/devops/build/builds/queue?view=azure-devops-rest-5.1#buildstatus
    /// </summary>
    public enum BuildStatus
    {
        /// <summary>
        /// No status
        /// </summary>
        [EnumMember(Value = "none")]
        None = 0,

        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "cancelling")]
        Cancelling = 1,

        /// <summary>
        /// The build has completed
        /// </summary>
        [EnumMember(Value = "completed")]
        Completed = 2,

        /// <summary>
        /// The build is currently in progress
        /// </summary>
        [EnumMember(Value = "inProgress")]
        InProgress = 3,

        /// <summary>
        /// The build has not yet started
        /// </summary>
        [EnumMember(Value = "notStarted")]
        NotStarted = 4,

        /// <summary>
        /// The build is inactive in the queue
        /// </summary>
        [EnumMember(Value = "postponed")]
        Postponed = 5,
    }
}
