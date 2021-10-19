using System;

namespace Altinn.Studio.DataModeling.Templates
{
    /// <summary>
    /// Base class for handling simple Json Schema templates.
    /// </summary>
    public abstract class JsonTemplate
    {
        /// <summary>
        /// The template based Json Schema. If not all variables are replaced these
        /// will remain as is.
        /// </summary>
        protected string JsonSchemaInstance { get; set; }

        /// <summary>
        /// Generic method for replacing av variable in a template string.
        /// Looks for the {{variableName}} in the string and replaces all
        /// occurences.
        /// </summary>
        /// <param name="variableName">The name of the variable to replace without the curly braces {{}}.</param>
        /// <param name="value">The value to insert.</param>
        protected void ReplaceVariable(string variableName, string value)
        {
            JsonSchemaInstance = JsonSchemaInstance.Replace("{{" + variableName + "}}", value, System.StringComparison.InvariantCultureIgnoreCase);
        }

        /// <summary>
        /// Sets the $id keyword in the Json Schema instance.
        /// </summary>
        /// <param name="uri">An abosolute and resolvable uri to this schema.</param>
        public void SetId(Uri uri)
        {
            ReplaceVariable("id", uri.AbsoluteUri);
        }

        /// <summary>
        /// Sets the meldingsnavn property of the info keyword.
        /// </summary>
        /// <param name="value">The value to set</param>
        public void SetRootType(string value)
        {
            ReplaceVariable("rootType", value);
        }

        /// <summary>
        /// Gets a string representation of the created Json Schema template.
        /// </summary>
        /// <returns></returns>
        public string GetJsonString()
        {
            return JsonSchemaInstance;
        }
    }
}
