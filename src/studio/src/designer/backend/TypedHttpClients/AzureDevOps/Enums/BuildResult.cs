using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums
{
    /// <summary>
    /// The Azure DevOps Build Result
    /// https://docs.microsoft.com/en-us/rest/api/azure/devops/build/builds/queue?view=azure-devops-rest-5.1#buildresult
    /// </summary>
    public enum BuildResult
    {
        /// <summary>
        /// The build result is none
        /// </summary>
        [EnumMember(Value = "none")]
        None = 0,

        /// <summary>
        /// The build has been canceled
        /// </summary>
        [EnumMember(Value = "canceled")]
        Canceled = 1,

        /// <summary>
        /// The build has failed
        /// </summary>
        [EnumMember(Value = "failed")]
        Failed = 2,

        /// <summary>
        /// The build has partially succeeded
        /// </summary>
        [EnumMember(Value = "partiallySucceeded")]
        PartiallySucceeded = 3,

        /// <summary>
        /// The build has succeeded
        /// </summary>
        [EnumMember(Value = "succeeded")]
        Succeeded = 4
    }
}
