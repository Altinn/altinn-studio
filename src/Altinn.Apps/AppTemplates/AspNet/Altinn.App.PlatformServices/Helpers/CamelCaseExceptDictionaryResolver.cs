using Newtonsoft.Json.Serialization;

namespace Altinn.App.Services.Helpers
{
    /// <summary>
    /// Camel case property name resolver but does not camel case dictionary keys
    /// </summary>
    public class CamelCaseExceptDictionaryResolver : CamelCasePropertyNamesContractResolver
    {
        /// <inheritdoc/>
        protected override string ResolveDictionaryKey(string dictionaryKey)
        {
            return dictionaryKey;
        }
    }
}
