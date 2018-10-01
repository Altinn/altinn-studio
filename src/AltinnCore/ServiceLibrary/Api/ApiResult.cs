using System.Collections.Generic;

namespace AltinnCore.ServiceLibrary.Api
{
    /// <summary>
    /// Defines the API result
    /// </summary>
    public class ApiResult
    {
        /// <summary>
        /// Gets or sets the status
        /// </summary>
        public ApiStatusType Status { get; set; }

        /// <summary>
        /// Gets or sets the ModelStateEntries
        /// </summary>
        public List<ApiModelStateEntry> ModelStateEntries { get; set; }

        /// <summary>
        /// Gets or sets the Message
        /// </summary>
        public string Message { get; set; }

        /// <summary>
        /// Gets or sets the InstanceId
        /// </summary>
        public int InstanceId { get; set; }
    }
}
