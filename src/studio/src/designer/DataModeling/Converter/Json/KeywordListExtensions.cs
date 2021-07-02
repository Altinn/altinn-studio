using System.Collections.Generic;
using System.Linq;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public static class KeywordListExtensions
    {
        /// <summary>
        /// Placeholder
        /// </summary>
        public static bool AnyOf<T>(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return keywords.Any(kw => kw is T);
        }

        /// <summary>
        /// Placeholder
        /// </summary>
        public static bool AnyOf<T1, T2, T3, T4, T5, T6, T7>(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return keywords.Any(kw => kw is T1 or T2 or T3 or T4 or T5 or T6 or T7);
        }
    }
}