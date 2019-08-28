using System;
using System.Collections.Generic;
using System.IO;
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
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">The application owner id</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        Task<Instance> InsertData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string appName, int instanceOwnerId);

        /// <summary>
        /// updates the form data
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The form data to serialize</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">The application owner id</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        void UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string appName, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the form data
        /// </summary>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">The application owner id</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        object GetFormData(Guid instanceGuid, Type type, string org, string appName, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the data as is.
        /// </summary>
        /// <param name="org">The application owner id</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="dataId">the data id</param>
        Task<Stream> GetData(string org, string appName, int instanceOwnerId, Guid instanceGuid, Guid dataId);

        /// <summary>
        /// Method that gets metadata on form attachments ordered by attachmentType
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        Task<List<AttachmentList>> GetFormAttachments(string org, string appName, int instanceOwnerId, Guid instanceGuid);

        /// <summary>
        /// Method that removes a form attachments from disk/storage
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentId">The attachment id</param>
        void DeleteFormAttachment(string org, string appName, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentId);

        /// <summary>
        /// Method that saves a form attachments to disk/storage and returns its id
        /// </summary>
        /// <param name="org">The organization for the service</param>
        /// <param name="appName">The application name</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentName">The attachment name</param>
        /// <param name="attachment">The attachment to be saved</param>
        Task<Guid> SaveFormAttachment(string org, string appName, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentName, HttpRequest attachment);
    }
}
