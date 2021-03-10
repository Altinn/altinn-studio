using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Defines the eFormidling shipment contract related to an application.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class EFormidlingContract
    {
        /// <summary>
        /// Service identifier for the process
        /// </summary>
        /// <remarks>
        /// Available services are DPO, DPV, DPF and DPI.
        /// </remarks>
        public string ServiceId { get; set; }

        /// <summary>
        /// Org number for the receiver of the shipment. 
        /// </summary>
        /// <remarks>
        /// Should only be included if a single static receiver.
        /// </remarks>
        public string Receiver { get; set; }

        /// <summary>
        /// Identifies which task should be completed before the shipment is sent.
        /// </summary>
        public string SendAfterTaskId { get; set; }

        /// <summary>
        /// Process type
        /// </summary>
        /// <remarks>
        /// Receiver must be able to support the process type. This is defined in receiver's capabilities.
        /// </remarks>
        public string Process { get; set; }

        /// <summary>
        /// List of ids for the data types to include in the shipment.
        /// </summary>
        public List<string> DataTypes { get; set; }
    }
}
