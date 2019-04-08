using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using AltinnCore.Common.Models;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for data handling
    /// </summary>
    public interface IData
    {
        /// <summary>
        /// Stores the form model
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The service model to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId for the reportee</param>
        Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId);
    }
}
