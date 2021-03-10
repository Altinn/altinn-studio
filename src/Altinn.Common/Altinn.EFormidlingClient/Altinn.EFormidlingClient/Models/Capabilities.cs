using System.Collections.Generic;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace Altinn.Common.EFormidlingClient.Models
{
    /// <summary>
    /// Initializes a new instance of the <see cref="Capabilities"/> class.
    /// </summary>
    public class Capabilities
    {
        /// <summary>
        ///  Gets or sets the Capabilities
        /// </summary>
        [JsonPropertyName("capabilities")]
        public List<Capability> Capability { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Capabilities"/> class.
        /// </summary>
        /// <param name="capabilities">Capabilities</param>
        public Capabilities(List<Capability> capabilities)
        {
            Capability = capabilities;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentType"/> class.
    /// </summary>
    [DataContract]
    public class DocumentType
    {
        /// <summary>
        ///  Gets or sets the Type
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the Standard
        /// </summary>
        public string Standard { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="DocumentType"/> class.
        /// </summary>
        /// <param name="type">Type</param>
        /// <param name="standard">Standard</param>
        public DocumentType(string type, string standard)
        {
            Type = type;
            Standard = standard;
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Capability"/> class.
    /// </summary>
    public class Capability
    {
        /// <summary>
        ///  Gets or sets the Standard
        /// </summary>
        public string Process { get; set; }

        /// <summary>
        ///  Gets or sets the Standard
        /// </summary>
        public string ServiceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the Standard
        /// </summary>
        public List<DocumentType> DocumentTypes { get; set; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Capability"/> class.
        /// </summary>
        /// <param name="process">Process</param>
        /// <param name="serviceIdentifier">ServiceIdentifier</param>
        /// <param name="documentTypes">DocumentTypes</param>
        public Capability(string process, string serviceIdentifier, List<DocumentType> documentTypes)
        {
            Process = process;
            ServiceIdentifier = serviceIdentifier;
            DocumentTypes = documentTypes;
        }
    }
}
