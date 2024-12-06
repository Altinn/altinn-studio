using System.Runtime.Serialization;

namespace Altinn.ResourceRegistry.Core.Enums.Altinn2
{
    /// <summary>
    /// Provides Enumeration for the types of services
    /// </summary>
    [DataContract(Namespace = "http://schemas.altinn.no/ServiceDevelopment/Service/2022/08")]
    public enum ServiceType : int
    {
        /// <summary>
        /// Service type not defined yet
        /// </summary>
        [EnumMember]
        None = 0,

        /// <summary>
        /// Correspondence/Message Service
        /// </summary>
        [EnumMember]
        Correspondence = 1,

        /// <summary>
        /// Reporting Service
        /// </summary>
        [EnumMember]
        Reporting = 2,

        /// <summary>
        /// Collaboration Service
        /// </summary>
        [EnumMember]
        Collaboration = 3,

        /// <summary>
        /// Lookup Service
        /// </summary>
        [EnumMember]
        Lookup = 4,

        /// <summary>
        /// Link Service
        /// </summary>
        [EnumMember]
        Link = 5,

        /// <summary>
        /// Broker Service
        /// </summary>
        [EnumMember]
        Broker = 6
    }
}
