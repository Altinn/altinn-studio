using System.Runtime.Serialization;

namespace AltinnCore.Designer.TypedHttpClients.AzureDevOps.Enums
{
    /// <summary>
    /// The Azure DevOps Build Result
    /// https://docs.microsoft.com/en-us/rest/api/azure/devops/build/builds/queue?view=azure-devops-rest-5.1#buildresult
    /// </summary>
    public enum BuildResult
    {
        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "cancelled")]
        Cancelled = 1,

        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "failed")]
        Failed = 2,

        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "none")]
        None = 3,

        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "partiallySucceeded")]
        PartiallySucceeded = 4,

        /// <summary>
        /// The build is cancelling
        /// </summary>
        [EnumMember(Value = "succeeded")]
        Succeeded = 5,
    }
}
