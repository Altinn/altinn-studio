using System;

namespace Altinn.App.PlatformServices.Models
{
    /// <summary>
    /// Class representing the id of an instance.
    /// </summary>
    public class InstanceIdentifier
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceIdentifier"/> class.
        /// </summary>
        /// /// <param name="instanceOwnerPartyId">The id of the party owning this instance.</param>
        /// <param name="instanceGuid">A <see cref="Guid"/> identifying the instance.</param>
        public InstanceIdentifier(int instanceOwnerPartyId, Guid instanceGuid)
        {        
            InstanceOwnerPartyId = instanceOwnerPartyId;
            InstanceGuid = instanceGuid;
        }

        /// <summary>
        /// Party owning this instance.
        /// </summary>
        public int InstanceOwnerPartyId { get; }

        /// <summary>
        /// Unique id identifying this instance.
        /// </summary>
        public Guid InstanceGuid { get; }
    }
}
