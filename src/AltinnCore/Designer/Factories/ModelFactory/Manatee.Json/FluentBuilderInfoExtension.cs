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
    public static class FluentBuilderInfoExtension
    {
        /// <summary>
        /// Add a named text to the <code>info</code> keyword.
        /// </summary>
        /// <param name="schema">Json Schema to add text to</param>
        /// <param name="name">Name for text</param>
        /// <param name="text">Actual text</param>
        /// <returns>schema containing new text</returns>
        public static JsonSchema Info(this JsonSchema schema, string name, string text)
        {
            var keyword = schema.OfType<InfoKeyword>().FirstOrDefault();

            if (keyword == null)
            {
                keyword = new InfoKeyword();
                schema.Add(keyword);
            }

            keyword.Add(name, text);

            return schema;
        }
    }
}
