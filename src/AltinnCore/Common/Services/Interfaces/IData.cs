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
        /// <param name="instanceId">The instance id</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId for the reportee</param>
        Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId);

        /// <summary>
        /// updates the form data
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The form data to serialize</param>
        /// <param name="instanceId">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId for the reportee</param>
        /// <param name="dataId">the data id</param>
        void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the form data
        /// </summary>
        /// <param name="instanceId">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The Organization code for the service owner</param>
        /// <param name="applicationId">The service code for the current service</param>
        /// <param name="instanceOwnerId">The partyId for the reportee</param>
        /// <param name="dataId">the data id</param>
        object GetFormData(Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId);
    }
}
