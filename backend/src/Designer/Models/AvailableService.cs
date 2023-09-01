using System;
using System.Runtime.Serialization;
using Altinn.ResourceRegistry.Core.Enums.Altinn2;

namespace Altinn.ResourceRegistry.Core.Models.Altinn2
{
    /// <summary>
    /// Contains information about an available service
    /// </summary>
    [DataContract(Namespace = "https://schemas.altinn.no/2022/08/sblbridge")]
    public class AvailableService
    {
        #region Data contract members

        /// <summary>
        /// Gets or sets Identifier used to identify Service Owner Code
        /// </summary>
        [DataMember]
        public string ServiceOwnerCode { get; set; }

        /// <summary>
        /// Gets or sets Name of Service Owner
        /// </summary>
        [DataMember]
        public string ServiceOwnerName { get; set; }

        /// <summary>
        /// Gets or sets Name of Available Service
        /// </summary>
        [DataMember]
        public string ServiceName { get; set; }

        /// <summary>
        /// Gets or sets Identifier used for identifying Service by External System
        /// </summary>
        [DataMember]
        public string ExternalServiceCode { get; set; }

        /// <summary>
        /// Gets or sets Identifier used for identifying Service Edition by External System
        /// </summary>
        [DataMember]
        public int ExternalServiceEditionCode { get; set; }

        /// <summary>
        /// Gets or sets Identifier used to identify Service Edition Version Name
        /// </summary>
        [DataMember]
        public string ServiceEditionVersionName { get; set; }

        /// <summary>
        /// Gets or sets Identifier used to identify Service Edition Version Name
        /// </summary>
        [DataMember]
        public int ServiceEditionVersionId { get; set; }

        /// <summary>
        /// Gets or sets Date from when Service is Valid
        /// </summary>
        [DataMember]
        public DateTime ValidFrom { get; set; }

        /// <summary>
        /// Gets or sets Date till when Service is Valid
        /// </summary>
        [DataMember]
        public DateTime ValidTo { get; set; }

        /// <summary>
        /// Gets or sets Service Type Id
        /// </summary>
        [DataMember]
        public ServiceType ServiceType { get; set; }

        /// <summary>
        /// Gets or sets the description text for delegations.
        /// </summary>
        [DataMember]
        public string DelegationDescription { get; set; }

        #endregion
    }
}
