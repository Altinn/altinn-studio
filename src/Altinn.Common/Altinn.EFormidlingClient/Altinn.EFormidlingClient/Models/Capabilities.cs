using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
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
        ///  Gets or sets the Capabilities.
        /// </summary>
        [JsonPropertyName("capabilities")]
        public List<Capability> Capability { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="DocumentType"/> class.
    /// </summary>
    [DataContract]
    public class DocumentType
    {
        /// <summary>
        ///  Gets or sets the Type. Document type. This is always identical to the last part of the standard.
        /// </summary>
        public string Type { get; set; }

        /// <summary>
        ///  Gets or sets the Standard. Document standard.
        /// </summary>
        public string Standard { get; set; }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="Capability"/> class.
    /// </summary>
    public class Capability
    {
        /// <summary>
        ///  Gets or sets the Process. Type of process.
        /// </summary>
        public string Process { get; set; }

        /// <summary>
        ///  Gets or sets the ServiceIdentifier. The service identifier. Can be one of: DPO, DPV, DPI, DPF, DPFIO, DPE, UNKNOWN
        /// </summary>
        public string ServiceIdentifier { get; set; }

        /// <summary>
        ///  Gets or sets the DocumentTypes
        /// </summary>
        public List<DocumentType> DocumentTypes { get; set; }
    }
}
