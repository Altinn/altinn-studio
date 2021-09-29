using System;
using System.IO;

namespace Altinn.Studio.DataModeling.Templates
{
    /// <summary>
    /// Provides a starting template for Seres based Json Schemas.
    /// </summary>
    public class SeresJsonTemplate : JsonTemplate
    {
        private const string JSON_TEMPLATE_FILEPATH = "Templates/seres.template.json";

        private static string JsonSchemaTemplate { get; }

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
    }
}
