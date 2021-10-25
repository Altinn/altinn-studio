using System;
using System.Collections.Generic;
using System.Text.Json;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models
{
    /// <summary>
    /// Specialized model for instansiation of instances
    /// </summary>
    public class InstansiationInstance
    {
        /// <summary>
        /// Gets or sets the instance owner information. 
        /// </summary>
        public InstanceOwner InstanceOwner { get; set; }

        /// <summary>
        /// Gets or sets the due date to submit the instance to application owner.
        /// </summary>
        public DateTime? DueBefore { get; set; }

        /// <summary>
        /// Gets or sets date and time for when the instance should first become visible for the instance owner.
        /// </summary>
        public DateTime? VisibleAfter { get; set; }

        /// <summary>
        /// Gets or sets the prefill values for the instance.        
        /// </summary>
        public Dictionary<string, string> Prefill { get; set; }

        /// <inheritdoc/>
        public override string ToString()
        {
            return JsonSerializer.Serialize(this);
        }
    }
}
