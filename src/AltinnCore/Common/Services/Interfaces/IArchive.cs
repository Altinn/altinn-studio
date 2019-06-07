using System;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// archive interface
    /// </summary>
    public interface IArchive
    {
        /// <summary>
        /// the archive service model
        /// </summary>
        /// <param name="dataToSerialize">data to be serialized</param>
        /// <param name="instanceId">the instance id</param>
        /// <param name="type">the type</param>
        /// <param name="org">the application owner</param>
        /// <param name="appName">the application name</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <typeparam name="T">the generic type parameter</typeparam>
        void ArchiveServiceModel<T>(T dataToSerialize, Guid instanceId, Type type, string org, string appName, int instanceOwnerId);

        /// <summary>
        /// Get the archive service model
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="type">the type</param>
        /// <param name="org">the organisation</param>
        /// <param name="appName">the application name></param>
        /// <param name="instanceOwnerId">the instance owner i</param>
        /// <returns>The archived service model</returns>
        object GetArchivedServiceModel(Guid instanceId, Type type, string org, string appName, int instanceOwnerId);
    }
}
