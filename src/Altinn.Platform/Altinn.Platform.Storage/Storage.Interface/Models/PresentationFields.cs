using Newtonsoft.Json;
using System.Collections.Generic;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents an set of settings where application owner can define custom sets of
    /// static data to present to end user in given task(s).
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class PresentationField
    {
        public string Id { get; set; }

        public string TextResource { get; set; }

        public string Value { get; set; }

        public List<string> TaskIds { get; set; }
    }
}
