using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.DataCleanup.Data
{
    /// <summary>
    /// Response with instances and continuationtoken
    /// </summary>
    public class InstanceList
    {
        /// <summary>
        /// List of instances
        /// </summary>
        public List<Instance> Instances { get; set; }

        /// <summary>
        /// ContinuationToken from Cosmos DB
        /// </summary>
        public string ContinuationToken { get; set; }
    }
}