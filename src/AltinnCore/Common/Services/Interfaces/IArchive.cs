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
        /// <param name="org">the organisation</param>
        /// <param name="service">the service</param>
        /// <param name="partyId">the party id</param>
        /// <typeparam name="T">the generic type parameter</typeparam>
        void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId);

        /// <summary>
        /// Get the archive service model
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="type">the type</param>
        /// <param name="org">the organisation</param>
        /// <param name="service">the service></param>
        /// <param name="partyId">the party id</param>
        /// <returns>The archived service model</returns>
        object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId);
    }
}
