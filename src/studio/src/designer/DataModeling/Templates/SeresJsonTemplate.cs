using System;
using System.IO;

namespace Altinn.Studio.DataModeling.Templates
{
    /// <summary>
    /// Provides a starting template for Seres based Json Schemas.
    /// </summary>
    public class SeresJsonTemplate
    {
        private const string JSON_TEMPLATE_FILEPATH = "Templates/seres.template.json";

        private static string JsonSchemaTemplate { get; }

        /// <summary>
        /// The template based Json Schema. If not all variables are replaced these
        /// will remain as is.
        /// </summary>
        public string JsonSchemaInstance { get; private set; }

        /// <summary>
        /// Static constructor to ensure the JsonTemplate is loaded and set,
        /// in other words it's caching the template for the lifetime of the application.
        /// </summary>
        static SeresJsonTemplate()
        {
            JsonSchemaTemplate = File.ReadAllText(JSON_TEMPLATE_FILEPATH);
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="SeresJsonTemplate"/> class.
        /// </summary>
        public SeresJsonTemplate(Uri uri, string schemaName)
        {
            JsonSchemaInstance = JsonSchemaTemplate;
            SetId(uri);
            SetMeldingsNavn(schemaName);
            SetModellnavn($"{schemaName}-modell");
        }

        /// <summary>
        /// Sets the $id keyword in the Json Schema instance.
        /// </summary>
        /// <param name="uri">An abosolute and resolvable uri to this schema.</param>
        private void SetId(Uri uri)
        {
            ReplaceVariable("id", uri.AbsoluteUri);
        }

        /// <summary>
        /// Sets the meldingsnavn property of the info keyword.
        /// </summary>
        /// <param name="value">The value to set</param>
        private void SetMeldingsNavn(string value)
        {
            ReplaceVariable("meldingsnavn", value);
        }

        /// <summary>
        /// Sets the modelnavn property of the info keyword.
        /// </summary>
        /// <param name="value">The value to set</param>
        private void SetModellnavn(string value)
        {
            ReplaceVariable("modellnavn", value);
        }

        /// <summary>
        /// Generic method for replacing av variable in a template string.
        /// Looks for the {{variableName}} in the string and replaces all
        /// occurences.
        /// </summary>
        /// <param name="variableName">The name of the variable to replace without the curly braces {{}}.</param>
        /// <param name="value">The value to insert.</param>
        private void ReplaceVariable(string variableName, string value)
        {
            JsonSchemaInstance = JsonSchemaInstance.Replace("{{" + variableName + "}}", value, System.StringComparison.InvariantCultureIgnoreCase);
        }
    }
}
