using System;

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
        /// <param name="formId">The formId</param>
        /// <param name="type">The type for serialization</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="partyId">The partyId for the reportee</param>
        void SaveFormModel<T>(T dataToSerialize, int formId, Type type, string org, string service, string edition, int partyId);

        /// <summary>
        /// Returns the Form model for a given from. 
        /// </summary>
        /// <param name="formId">The formId</param>
        /// <param name="type">The type</param>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="partyId">The partyId</param>
        /// <returns>The form model</returns>
        object GetFormModel(int formId, Type type, string org, string service, string edition, int partyId);

        /// <summary>
        /// Operation that returns a prefill populated form model
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="edition">The edition code for the current service</param>
        /// <param name="type">The type of the form model</param>
        /// <param name="partyId">The partyId</param>
        /// <param name="prefillkey">The prefill key</param>
        /// <returns>The prefilled form model</returns>
        object GetPrefill(string org, string service, string edition, Type type, int partyId, string prefillkey);
    }
}
