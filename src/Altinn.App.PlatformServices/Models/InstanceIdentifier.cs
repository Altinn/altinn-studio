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
            IsNoInstance = false;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceIdentifier"/> class.
        /// </summary>
        /// <param name="instanceId">InstanceId combined of the form instanceOwnerId/instanceGuid</param>
        public InstanceIdentifier(string instanceId)
        {
            (InstanceOwnerPartyId, InstanceGuid) = DeconstructInstanceId(instanceId);
            IsNoInstance = false;
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="InstanceIdentifier"/> class. For instances without OwnerPartyId and InstanceId, ex: Stateless applications.
        /// </summary>
        private InstanceIdentifier()
        {
            InstanceOwnerPartyId = 0;
            InstanceGuid = Guid.Empty;
            IsNoInstance = true;
        }

        /// <summary>
        /// Creates a new instance of the <see cref="InstanceIdentifier"/> class based on a url string.
        /// </summary>
        /// <param name="url">Parses the instance id from the given uri</param>
        public static InstanceIdentifier CreateFromUrl(string url)
        {
            var (instanceOwnerPartyId, instanceGuid) = DeconstructInstanceIdFromUrl(url);

            return new InstanceIdentifier(instanceOwnerPartyId, instanceGuid);
        }

        /// <summary>
        /// Get InstanceIdentifier for no instance. This is used for stateless applications.
        /// INoInstance is set to true.
        /// </summary>
        public static readonly InstanceIdentifier NoInstance = new InstanceIdentifier();

        /// <summary>
        /// Party owning this instance.
        /// </summary>
        public int InstanceOwnerPartyId { get; }

        /// <summary>
        /// Unique id identifying this instance.
        /// </summary>
        public Guid InstanceGuid { get; }

        /// <summary>
        /// Internal flag set to true if object is of type NoInstance.
        /// </summary>
        public bool IsNoInstance { get; }

        /// <summary>
        /// Gets the instance id to be used when looking up this instance in storage api.
        /// The url needs to conform to .../instances/{instanceOwerId}/{instanceOwnerGuid}/... pattern.
        /// </summary>
        /// <returns>Instance id combinging instance owner and instance guid.</returns>
        public string GetInstanceId()
        {
            if (IsNoInstance)
            {
                throw new ArgumentNullException(nameof(InstanceGuid), "No instance id available for instance");
            }
            
            return $"{InstanceOwnerPartyId}/{InstanceGuid}";
        }

        /// <summary>
        /// Deconstructs an instance id into it's two logical parts - instanceOwnerPartyId and instanceGuid.
        /// Party represents either the person or the organization that owns the instance.
        /// </summary>
        /// <param name="instanceId">Instance identifier on the form {instanceOwnerPartyId}/{InstanceGuid}</param>
        /// <returns>A 2-tuple with the partyId (int) and the instanceGuid (Guid).</returns>
        private static (int InstanceOwnerPartyId, Guid InstanceGuid) DeconstructInstanceId(string instanceId)
        {
            var deconstructed = instanceId.Split("/");
            int instanceOwnerPartyId = int.Parse(deconstructed[0]);
            Guid instanceGuid = Guid.Parse(deconstructed[1]);

            return (instanceOwnerPartyId, instanceGuid);
        }

        /// <summary>
        /// Deconstructs an instance based url string into instanceOwnerId and InstanceGuid.
        /// The url needs to conform to .../instances/{instanceOwerId}/{instanceOwnerGuid}/... pattern.
        /// </summary>
        /// <param name="url">The url to parse</param>
        /// <returns>A 2-tuple with the partyId (int) and the instanceGuid (Guid).</returns>
        private static (int InstanceOwnerId, Guid InstanceOwnerGuid) DeconstructInstanceIdFromUrl(string url)
        {
            var searchFor = "/instances/";
            var instanceSubpath = url.Substring(url.IndexOf(searchFor) + searchFor.Length);

            return DeconstructInstanceId(instanceSubpath);
        }
    }
}
