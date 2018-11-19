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
        /// <typeparam name="T"></typeparam>
        /// <param name="dataToSerialize"></param>
        /// <param name="instanceId"></param>
        /// <param name="type"></param>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <param name="partyId"></param>
        void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId);

        /// <summary>
        /// Get the archive service model
        /// </summary>
        /// <param name="instanceId"></param>
        /// <param name="type"></param>
        /// <param name="org"></param>
        /// <param name="service"></param>
        /// <param name="partyId"></param>
        /// <returns></returns>
        object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId);
    }
}
