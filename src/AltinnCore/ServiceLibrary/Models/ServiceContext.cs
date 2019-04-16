using System;
using System.Collections.Generic;
using AltinnCore.ServiceLibrary.Models.Workflow;

namespace AltinnCore.ServiceLibrary.Models
{
    /// <summary>
    /// Class representing the context for a service
    /// </summary>
    public class ServiceContext
    {
        /// <summary>
        /// Gets or sets the current user context
        /// </summary>
        public UserContext UserContext { get; set; }

        /// <summary>
        /// Gets or sets the current reportee
        /// </summary>
        public Reportee Reportee { get; set; }

        /// <summary>
        /// Gets or sets the texts available for this service
        /// </summary>
        public Dictionary<string, Dictionary<string, string>> ServiceText { get; set; }

        /// <summary>
        /// Gets or sets the name of the service
        /// </summary>
        public string ServiceName { get; set; }

        /// <summary>
        /// Gets or sets the service code
        /// </summary>
        public string ServiceCode { get; set; }

        /// <summary>
        /// Gets or sets the current culture
        /// </summary>
        public string CurrentCulture { get; set; }

        /// <summary>
        /// Gets or sets the default language for the service
        /// </summary>
        public int DefaultLanguageID { get; set; }

        /// <summary>
        /// Gets or sets the Type of the service model
        /// </summary>
        public Type ServiceModelType { get; set; }

        /// <summary>
        /// Gets or sets the field metadata for the service
        /// </summary>
        public Dictionary<string, FieldMetadata> FieldMetaData { get; set; }

        /// <summary>
        /// Gets or sets the service metadata
        /// </summary>
        public ServiceMetadata.ServiceMetadata ServiceMetaData { get; set; }

        /// <summary>
        /// Gets or sets the name of the root element in the data model
        /// </summary>
        public string RootName { get; set; }

        /// <summary>
        /// Gets or sets the list of workflows
        /// </summary>
        public IList<WorkFlowStep> WorkFlow { get; set; } 

        /// <summary>
        /// Gets the text corresponding to the given resource key for the current culture
        /// </summary>
        /// <param name="key">The key of the resource text to retrieve</param>
        /// <returns>The text corresponding to the given key in the current language</returns>
        public string GetText(string key)
        {
            if (ServiceText?.ContainsKey(CurrentCulture) == true && ServiceText[CurrentCulture].ContainsKey(key))
            {
                return ServiceText[CurrentCulture][key];
            }

            return "Missing Text for " + key;
        }
    }
}
