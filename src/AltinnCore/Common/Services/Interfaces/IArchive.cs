using System;

namespace AltinnCore.Common.Services.Interfaces
{
    public interface IArchive
    {
        void ArchiveServiceModel<T>(T dataToSerialize, int instanceId, Type type, string org, string service, int partyId);

        object GetArchivedServiceModel(int instanceId, Type type, string org, string service, int partyId);
    }
}
