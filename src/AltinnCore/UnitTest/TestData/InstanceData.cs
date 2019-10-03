using System;
using Altinn.Platform.Storage.Models;

namespace AltinnCore.UnitTest.TestData
{
    /// <summary>
    /// Represents operations to obtain <see cref="Instance"/> data for a unit test.
    /// </summary>
    public static class InstanceData
    {
        /// <summary>
        /// Get application metadata for a specific application.
        /// </summary>
        /// <param name="appId">The id of the application to return</param>
        /// <param name="instanceOwnerId">The id of the owner of the instance to return.</param>
        /// <param name="instanceId">The id of the actual instance.</param>
        /// <returns>The application metadata.</returns>
        public static Instance Get(string appId, int instanceOwnerId, Guid instanceId)
        {
            appId = appId.Replace('/', '_');
            string path = $"TestData/{appId}/instances/{instanceOwnerId}_{instanceId}.json";
            return FileDeserialiser.DeserialiseFile<Instance>(path);
        }

        /// <summary>
        /// Get application metadata for a specific application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation</param>
        /// <param name="instanceOwnerId">Unique id of the party that is the owner of the instance.</param>
        /// <param name="instanceId">Unique id to identify the instance</param>
        /// <returns>The application metadata.</returns>
        public static Instance Get(string org, string app, int instanceOwnerId, Guid instanceId)
        {
            string path = $"TestData/{org}_{app}/instances/{instanceOwnerId}_{instanceId}.json";
            return FileDeserialiser.DeserialiseFile<Instance>(path);
        }
    }
}
