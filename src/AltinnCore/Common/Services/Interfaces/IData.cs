using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
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
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        Task<Instance> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId);

        /// <summary>
        /// updates the form data
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The form data to serialize</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        Task<Instance> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the form data
        /// </summary>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        object GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerId, Guid dataId);

        /// <summary>
        /// Gets the data as is.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="dataId">the data id</param>
        Task<Stream> GetBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataId);

        /// <summary>
        /// Method that gets metadata on form attachments ordered by attachmentType
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerId, Guid instanceGuid);

        /// <summary>
        /// Method that removes a form attachments from disk/storage
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="dataGuid">The attachment id</param>
        Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid);

        /// <summary>
        /// Method that saves a form attachments to disk/storage and returns the new data element.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentName">The attachment name</param>
        /// <param name="request">Http request containing the attachment to be saved</param>
        Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentName, HttpRequest request);

        /// <summary>
        /// Method that saves a form attachments to disk/storage and returns the new data element.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="attachmentType">The attachment type</param>
        /// <param name="attachmentName">The attachment name</param>
        /// <param name="content">The attachemnt content stream to be stored</param>
        Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, string attachmentType, string attachmentName, StreamContent content);

        /// <summary>
        /// Method that updates a form attachments to disk/storage and returns the updated data element.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="dataGuid">The data id</param>
        /// <param name="request">Http request containing the attachment to be saved</param>
        Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerId, Guid instanceGuid, Guid dataGuid, HttpRequest request);
    }
}
