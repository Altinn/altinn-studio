using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for handling form related operations
    /// </summary>
    public interface IForm
    {
        /// <summary>
        /// This method saves a form attachment
        /// </summary>
        /// <param name="applicationOwnerId">The applicaiton owner id</param>
        /// <param name="applicationId">The application Id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="formId">The form id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The file name for the attachment</param>
        string GetAttachmentUploadUrl(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid formId, string attachmentType, string attachmentName);

        /// <summary>
        /// Gets url of attachment delete
        /// </summary>
        /// <param name="applicationOwnerId">The applicaiton owner id</param>
        /// <param name="applicationId">The application Id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="formId">The form id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The file name for the attachment</param>
        /// <param name="attachmentId">The id for the attachment</param>
        string GetAttachmentDeleteUrl(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid formId, string attachmentType, string attachmentName, string attachmentId);

        /// <summary>
        /// Gets url of attachment list
        /// </summary>
        /// <param name="applicationOwnerId">The applicaiton owner id</param>
        /// <param name="applicationId">The application Id</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="formId">The form id</param>
        string GetAttachmentListUrl(string applicationOwnerId, string applicationId, int instanceOwnerId, Guid formId);

        /// <summary>
        /// Operation that returns a prefill populated form model
        /// </summary>
        /// <param name="applicationOwnerId">The applicaiton owner id</param>
        /// <param name="applicationId">The application Id</param>
        /// <param name="type">The type of the form model</param>
        /// <param name="instanceOwnerId">The instance owner id</param>
        /// <param name="prefillkey">The prefill key</param>
        /// <returns>The prefilled form model</returns>
        object GetPrefill(string applicationOwnerId, string applicationId, Type type, int instanceOwnerId, string prefillkey);
    }
}
