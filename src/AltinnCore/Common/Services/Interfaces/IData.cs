using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Models;
using Microsoft.AspNetCore.Http;

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
        /// <param name="dataToSerialize">The app model to serialize</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId);

        /// <summary>
        /// updates the form data
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The form data to serialize</param>
        /// <param name="instanceId">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        void UpdateData<T>(T dataToSerialize, Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the form data
        /// </summary>
        /// <param name="instanceId">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        object GetFormData(Guid instanceId, Type type, string applicationOwnerId, string applicationId, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Method that gets metadata on form attachments ordered by attachmentType
        /// </summary>
        /// <param name="applicationOwnerId">The organization for the service</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceId">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        Task<List<AttachmentList>> GetFormAttachments(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId);

        /// <summary>
        /// Method that removes a form attachments from disk/storage
        /// </summary>
        /// <param name="applicationOwnerId">The organization for the service</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentId">The attachment id</param>
        void DeleteFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentId);

        /// <summary>
        /// Method that saves a form attachments to disk/storage and returns its id
        /// </summary>
        /// <param name="applicationOwnerId">The organization for the service</param>
        /// <param name="applicationId">The application id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceId">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentName">The attachment name</param>
        /// <param name="attachment">The attachment to be saved</param>
        Task<Guid> SaveFormAttachment(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid instanceId, string attachmentType, string attachmentName, HttpRequest attachment);
    }
}
