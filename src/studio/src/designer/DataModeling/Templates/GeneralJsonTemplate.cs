using System;
using System.IO;
using System.Reflection;
using System.Text;

namespace Altinn.Studio.DataModeling.Templates
{
    /// <summary>
    /// Provides a starting template for general Json Schemas.
    /// </summary>
    public class GeneralJsonTemplate : JsonTemplate
    {
        private const string JSON_TEMPLATE_FILEPATH = "Templates/general.template.json";

        private static string JsonSchemaTemplate { get; }

        /// <summary>
        /// Static constructor to ensure the JsonTemplate is loaded and set,
        /// in other words it's caching the template for the lifetime of the application.
        /// </summary>
        static GeneralJsonTemplate()
        {
            var directory = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            var filePath = Path.Combine(directory, JSON_TEMPLATE_FILEPATH);
            JsonSchemaTemplate = File.ReadAllText(filePath, Encoding.UTF8);
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="SeresJsonTemplate"/> class.
        /// </summary>
        public GeneralJsonTemplate(Uri uri, string schemaName)
        {
            JsonSchemaInstance = JsonSchemaTemplate;
            SetId(uri);
            SetRootType(schemaName);
        }
    }
}
