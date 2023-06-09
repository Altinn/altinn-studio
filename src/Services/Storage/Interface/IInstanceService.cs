using System;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Services
{
    /// <summary>
    /// This interface describes the required methods and features of a instance service implementation.
    /// </summary>
    public interface IInstanceService
    {
        /// <summary>
        /// Create signature document for given dataelements, this includes creating md5 hash for all blobs listed.
        /// </summary>
        /// <param name="instanceOwnerPartyId">The instance owner partyId</param>
        /// <param name="instanceGuid">The instance guid</param>
        /// <param name="signRequest">Signrequest containing data element ids and sign status</param>
        /// <param name="userId">User id for the authenticated user</param>
        Task<(bool Created, ServiceError ServiceError)> CreateSignDocument(int instanceOwnerPartyId, Guid instanceGuid, SignRequest signRequest, int userId); 
    }
}