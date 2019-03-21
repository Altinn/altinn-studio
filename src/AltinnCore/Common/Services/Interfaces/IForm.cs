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
        /// Stores the form model
        /// </summary>
        /// <typeparam name="T">The type</typeparam>
        /// <param name="dataToSerialize">The service model to serialize</param>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId for the reportee</param>
        Task<Guid> SaveFormModel<T>(T dataToSerialize, Guid instanceId, Type type, string org, string service, int partyId, Guid dataId);

        /// <summary>
        /// This method saves a form attachment
        /// </summary>
        /// <param name="org">The organization codefor the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="formId">The form id</param>
        /// <param name="attachmentType">The attachment type id</param>
        /// <param name="attachmentName">The file name for the attachment</param>
        string GetAttachmentUploadUrl(string org, string service, int partyId, int formId, string attachmentType, string attachmentName);

        /// <summary>
        /// Returns the Form model for a given from.
        /// </summary>
        /// <param name="instanceId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="developer">The name of the developer if any</param>
        /// <returns>The form model</returns>
        object GetFormModel(Guid instanceId, Type type, string org, string service, int partyId, string developer = null);

        /// <summary>
        /// Operation that returns a prefill populated form model
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="type">The type of the form model</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="prefillkey">The prefill key</param>
        /// <returns>The prefilled form model</returns>
        object GetPrefill(string org, string service, Type type, int partyId, string prefillkey);
    }
}
