using System;
using System.Collections.Generic;
using System.Linq;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Utils
{
    /// <summary>
    /// Extension methods for working with JsonSchema
    /// </summary>
    public static class JsonSchemaExtensions
    {
        /// <summary>
        /// Get a keyword from a JsonSchema instance or <code>null</code> if not found.
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="schema">Look for the keyword in this schema instance</param>
        /// <returns>The keyword or <code>null</code> if not found</returns>
        public static T GetKeyword<T>(this JsonSchema schema)
            where T : IJsonSchemaKeyword
        {
            return schema.Keywords.GetKeyword<T>();
        }

        /// <summary>
        /// Get a keyword from a JsonSchema instance or <code>null</code> if not found.
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="keywords">Look for the keyword in this list of keywords</param>
        /// <returns>The keyword or <code>null</code> if not found</returns>
        public static T GetKeyword<T>(this IEnumerable<IJsonSchemaKeyword> keywords)
            where T : IJsonSchemaKeyword
        {
            return (T)keywords.SingleOrDefault(keyword => keyword is T);
        }

        /// <summary>
        /// Try to retrieve a keyword with the given type from the Json Schema
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="schema">Look for the keyword in this schema instance</param>
        /// <param name="keyword">The keyword or <code>null</code> if not found</param>
        /// <returns><code>true</code> if the keyword is found, <code>false</code> otherwise</returns>
        public static bool TryGetKeyword<T>(this JsonSchema schema, out T keyword)
            where T : IJsonSchemaKeyword
        {
            keyword = schema.Keywords.GetKeyword<T>();
            return keyword != null;
        }

        /// <summary>
        /// Try to retrieve a keyword with the given type from the Json Schema
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="keywords">Look for the keyword in this list of keywords</param>
        /// <param name="keyword">The keyword or <code>null</code> if not found</param>
        /// <returns><code>true</code> if the keyword is found, <code>false</code> otherwise</returns>
        public static bool TryGetKeyword<T>(this IEnumerable<IJsonSchemaKeyword> keywords, out T keyword)
            where T : IJsonSchemaKeyword
        {
            keyword = (T)keywords.SingleOrDefault(keyword => keyword is T);
            return keyword != null;
        }

        /// <summary>
        /// Determine if a keyword is present in the schema
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="schema">Look for the keyword in this schema instance</param>
        /// <returns><code>true</code> if found <code>false</code> otherwise</returns>
        public static bool HasKeyword<T>(this JsonSchema schema)
        {
            return schema.Keywords.HasKeyword<T>();
        }

        /// <summary>
        /// Determine if a keyword is present in the schema
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="schema">Look for the keyword in this schema instance</param>
        /// <param name="filter">A filter callback function</param>
        /// <returns><code>true</code> if found <code>false</code> otherwise</returns>
        public static bool HasKeyword<T>(this JsonSchema schema, Func<T, bool> filter)
        {
            return schema.Keywords.HasKeyword(filter);
        }

        /// <summary>
        /// Determine if a keyword is present in the keyword list
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="keywords">Look for the keyword in this schema instance</param>
        /// <returns><code>true</code> if found <code>false</code> otherwise</returns>
        public static bool HasKeyword<T>(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return keywords.Any(keyword => keyword is T);
        }

        /// <summary>
        /// Determine if a keyword is present in the keyword list
        /// </summary>
        /// <typeparam name="T">The keyword type to search for</typeparam>
        /// <param name="keywords">Look for the keyword in this schema instance</param>
        /// <param name="filter">A filter callback func</param>
        /// <returns><code>true</code> if found <code>false</code> otherwise</returns>
        public static bool HasKeyword<T>(this IEnumerable<IJsonSchemaKeyword> keywords, Func<T, bool> filter)
        {
            return keywords
                .Where(keyword => keyword is T)
                .Cast<T>()
                .Any(filter);
        }

        /// <summary>
        /// Create a <see cref="WorkList{T}"/> from the keywords in this instance of <see cref="JsonSchema"/>
        /// </summary>
        /// <param name="schema">The schema instance</param>
        /// <returns>A <see cref="WorkList{T}"/> of keywords</returns>
        public static WorkList<IJsonSchemaKeyword> AsWorkList(this JsonSchema schema)
        {
            return schema.Keywords.AsWorkList();
        }

        /// <summary>
        /// Create a <see cref="WorkList{T}"/> from the list of keywords
        /// </summary>
        /// <param name="keywords">The schema instance</param>
        /// <returns>A <see cref="WorkList{T}"/> of keywords</returns>
        public static WorkList<IJsonSchemaKeyword> AsWorkList(this IEnumerable<IJsonSchemaKeyword> keywords)
        {
            return new WorkList<IJsonSchemaKeyword>(keywords);
        }
    }
}
