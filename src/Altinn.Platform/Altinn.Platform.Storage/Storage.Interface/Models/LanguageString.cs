using System.Collections.Generic;

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models
{
    /// <summary>
    /// Represents a dictionary collection of translated texts where the key is a language id and the value is the text.
    /// </summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class LanguageString : Dictionary<string, string>
    { 
    }
}
