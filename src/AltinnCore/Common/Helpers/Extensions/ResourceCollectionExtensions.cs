using System.Collections.Generic;
using System.Linq;

using AltinnCore.ServiceLibrary;

namespace AltinnCore.Common.Helpers.Extensions
{
    /// <summary>
    /// The resource collection extensions.
    /// </summary>
    public static class ResourceCollectionExtensions
    {
        /// <summary>
        /// The to key to language to value dictionary.
        /// </summary>
        /// <param name="resourcesCollections">
        /// The resources collections.
        /// </param>
        /// <returns>
        /// The dictionary of dictionaries.
        /// Key in outer dictionary is the text resource id
        /// Key in the inner dictionary is the language code.
        /// </returns>
        public static Dictionary<string, Dictionary<string, string>> ToKeyToLanguageToValueDictionary(
            this IEnumerable<ResourceCollection> resourcesCollections)
        {
            Guard.AssertArgumentNotNull(resourcesCollections, nameof(resourcesCollections));

            var allKeys = resourcesCollections
                .Where(r => r?.Resources != null)
                .SelectMany(c => c.Resources.Select(r => new { c.Language, r.Id, r.Value }))
                .ToList();
            var result = allKeys.GroupBy(k => k.Id)
                    .ToDictionary(g => g.Key, g => g.ToDictionary(l => l.Language, l => l.Value));
            return result;
        }
    }
}
