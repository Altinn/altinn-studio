using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Altinn.App.Services.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;

namespace Altinn.App.Services.Interface
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
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="dataType">The data type to create, must be a valid data type defined in application metadata</param>
        Task<DataElement> InsertFormData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, string dataType);

        Task<DataElement> InsertFormData<T>(Instance instance, string dataType, T dataToSerialize, Type type);

        /// <summary>
        /// updates the form data
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The form data to serialize</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        Task<DataElement> UpdateData<T>(T dataToSerialize, Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId);

        /// <summary>
        /// Gets the form data
        /// </summary>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="dataId">the data id</param>
        Task<object> GetFormData(Guid instanceGuid, Type type, string org, string app, int instanceOwnerPartyId, Guid dataId);

        /// <summary>
        /// Gets the data as is.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="instanceGuid">The instanceid</param>
        /// <param name="dataId">the data id</param>
        Task<Stream> GetBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataId);

        /// <summary>
        /// Method that gets metadata on form attachments ordered by attachmentType
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <returns>A list with attachments metadata ordered by attachmentType</returns>
        Task<List<AttachmentList>> GetBinaryDataList(string org, string app, int instanceOwnerPartyId, Guid instanceGuid);

        /// <summary>
        /// Method that removes a form attachments from disk/storage
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="dataGuid">The attachment id</param>
        Task<bool> DeleteBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid);

        /// <summary>
        /// Method that saves a form attachments to disk/storage and returns the new data element.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="dataType">The data type to create, must be a valid data type defined in application metadata</param>
        /// <param name="request">Http request containing the attachment to be saved</param>
        Task<DataElement> InsertBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, string dataType, HttpRequest request);

        /// <summary>
        /// Method that updates a form attachments to disk/storage and returns the updated data element.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="instanceOwnerPartyId">The instance owner id</param>
        /// <param name="instanceGuid">The instance id</param>
        /// <param name="dataGuid">The data id</param>
        /// <param name="request">Http request containing the attachment to be saved</param>
        Task<DataElement> UpdateBinaryData(string org, string app, int instanceOwnerPartyId, Guid instanceGuid, Guid dataGuid, HttpRequest request);


        /// <summary>
        /// Updates a binary data element. 
        /// </summary>
        /// <param name="instanceId">isntanceId = {instanceOwnerPartyId}/{instanceGuid}</param>
        /// <param name="dataType">data type</param>
        /// <param name="contentType">content type</param>
        /// <param name="filename">filename</param>
        /// <param name="stream">the stream to stream</param>
        /// <returns></returns>
        Task<DataElement> InsertBinaryData(string instanceId, string dataType, string contentType, string filename, Stream stream);


        /// <summary>
        /// Updates the data element object metadata.
        /// </summary>
        /// <param name="instanceId">The instance id</param>
        /// <param name="dataElement">The data element with values to update</param>
        /// <returns>the updated data element</returns>
        Task<DataElement> Update(string instanceId, DataElement dataElement);

    }
}
