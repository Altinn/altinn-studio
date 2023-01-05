using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json;
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
        /// <param name="category">Category for text</param>
        /// <param name="name">Name for text</param>
        /// <param name="text">Actual text</param>
        /// <returns>schema containing new category and texts</returns>
        public static JsonSchema Texts(this JsonSchema schema, string category, string name, string text)
        {
            var keyword = schema.OfType<TextsKeyword>().FirstOrDefault();
            if (keyword == null)
            {
                keyword = new TextsKeyword();
                schema.Add(keyword);
            }

            if (keyword.ContainsKey(category))
            {
                JsonSchema categorySchema = keyword[category];
                categorySchema.OtherData.Add(name, text);
            }
            else
            {
                JsonSchema categorySchema = new JsonSchema();
                categorySchema.OtherData.Add(name, text);
                keyword.Add(category, categorySchema);
            }

            return schema;
        }
    }
}
