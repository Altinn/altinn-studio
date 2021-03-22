using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Text;
using System.Text.Json.Serialization;

namespace Altinn.EFormidlingClient.Models
{
    /// <summary>
    /// Initializes a new instance of the <see cref="CreateSubscription"/> class.
    /// </summary>
    [ExcludeFromCodeCoverage]
    public class CreateSubscription
    {
        /// <summary>
        ///  Gets or sets the Name. A label to remember why it was created. Use it for whatever purpose you’d like.
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; }

        /// <summary>
        ///  Gets or sets the PushEndpoint. URL to push the webhook messages to.
        /// </summary>
        [JsonPropertyName("pushEndpoint")]
        public string PushEndpoint { get; set; }

        /// <summary>
        ///  Gets or sets the Resource. Indicates the noun being observed.
        /// </summary>
        [JsonPropertyName("resource")]
        public string Resource { get; set; }

        /// <summary>
        ///  Gets or sets the Event. Further narrows the events by specifying the action that would trigger a notification to your backend.
        /// </summary>
        [JsonPropertyName("event")]
        public string Event { get; set; }

        /// <summary>
        ///  Gets or sets the Event. A set of filtering criteria. Generally speaking, webhook filters will be a subset of the query parameters available when GETing a list of the target resource.
        ///  It is an optional property. To add multiple filters, separate them with the "&" symbol. Supported filters are: status, serviceIdentifier, direction.
        /// </summary>
        [JsonPropertyName("filter")]
        public string Filter { get; set; }
    }
}
