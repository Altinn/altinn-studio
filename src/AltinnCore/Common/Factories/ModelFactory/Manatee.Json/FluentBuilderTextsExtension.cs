using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using AltinnCore.Common.Factories.ModelFactory.Manatee.Json;
using Manatee.Json;

namespace Manatee.Json.Schema
{
    /// <summary>
    /// Extends <see cref="JsonSchema"/> to aid in construction.
    /// </summary>
    public static class FluentBuilderTextsExtension
    {
        /// <summary>
        /// Add a category of texts to the <code>texts</code> keyword.
        /// </summary>
        /// <param name="schema">Json Schema to add category of texts to</param>
        /// <param name="category">Category for texts</param>
        /// <param name="texts">Json Schema containing texts</param>
        /// <returns>schema containing new category and texts</returns>
        public static JsonSchema Texts(this JsonSchema schema, string category, JsonSchema texts)
        {
            var keyword = schema.OfType<TextsKeyword>().FirstOrDefault();

            if (keyword == null)
            {
                keyword = new TextsKeyword();
                schema.Add(keyword);
            }

            keyword.Add(category, texts);

            return schema;
        }
    }
}
