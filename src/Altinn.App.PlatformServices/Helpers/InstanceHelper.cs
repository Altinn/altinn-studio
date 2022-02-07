using System;

namespace Altinn.App.PlatformServices.Helpers
{
    /// <summary>
    /// Helper class for handling instances.
    /// </summary>
    public static class InstanceHelper
    {
        /// <summary>
        /// Deconstructs an instance id into it's two logical parts - instanceOwnerPartyId and instanceGuid.
        /// Party represents either the person or the organization that owns the instance.
        /// </summary>
        /// <param name="instanceId">Instance identifier on the form {instanceOwnerPartyId}/{InstanceGuid}</param>
        /// <returns>A 2-tuple with the partyId (int) and the instanceGuid (Guid).</returns>
        public static Tuple<int, Guid> DeconstructInstanceId(string instanceId)
        {
            var deconstructed = instanceId.Split("/");
            int instanceOwnerPartyId = int.Parse(deconstructed[0]);
            Guid instanceGuid = Guid.Parse(deconstructed[1]);

            return new Tuple<int, Guid>(instanceOwnerPartyId, instanceGuid);
        }

        /// <summary>
        /// Deconstructs an instance based url string into instanceOwnerId and InstanceGuid.
        /// The url needs to conform to .../instances/{instanceOwerId}/{instanceOwnerGuid}/... pattern.
        /// </summary>
        /// <param name="url">The url to parse</param>
        /// <returns>A 2-tuple with the partyId (int) and the instanceGuid (Guid).</returns>
        public static Tuple<int, Guid> DeconstructInstanceIdFromUrl(string url)
        {
            var searchFor = "/instances/";
            var instanceSubpath = url.Substring(url.IndexOf(searchFor) + searchFor.Length);

            return DeconstructInstanceId(instanceSubpath);
        }
    }
}
