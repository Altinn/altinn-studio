using System;
using System.IO;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Azure;

namespace Altinn.Platform.Authorization.Services.Interface
{
    /// <summary>
    /// Defines the interface for the Policy Retrival Point
    /// </summary>
    public interface IPolicyRetrievalPoint
    {
        /// <summary>
        /// Returns a policy based on the context request
        /// </summary>
        /// <param name="request">The context request</param>
        /// <returns>XacmlPolicy</returns>
        Task<XacmlPolicy> GetPolicyAsync(XacmlContextRequest request);

        /// <summary>
        /// Returns a policy based the org and app
        /// </summary>
        /// <param name="org">The organisation</param>
        /// <param name="app">The app</param>
        /// <returns>XacmlPolicy</returns>
        Task<XacmlPolicy> GetPolicyAsync(string org, string app);

        /// <summary>
        /// Returns a specific version of a policy if it exits on the provided path
        /// </summary>
        /// <param name="policyPath">The blobstorage path to the policy file</param>
        /// <param name="version">The specific blob storage version to get</param>
        /// <returns>XacmlPolicy and ETag tuple</returns>
        Task<XacmlPolicy> GetPolicyVersionAsync(string policyPath, string version);

        /// <summary>
        /// Returns a specific version of a policy if it exits on the provided path, and the ETag of the blob version
        /// </summary>
        /// <param name="policyPath">The blobstorage path to the policy file</param>
        /// <param name="version">The specific blob storage version to get</param>
        /// <returns>XacmlPolicy and ETag</returns>
        Task<(XacmlPolicy, ETag)> GetPolicyVersionAndETagAsync(string policyPath, string version);
    }
}
