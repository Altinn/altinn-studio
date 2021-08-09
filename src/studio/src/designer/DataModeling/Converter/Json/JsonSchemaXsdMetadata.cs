using System.Collections.Generic;
using Json.Pointer;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Contains information about the Json Schema as relates to an xsd schema
    /// </summary>
    public class JsonSchemaXsdMetadata
    {
        private static readonly IReadOnlyCollection<CompatibleXsdType> _empty = new List<CompatibleXsdType>().AsReadOnly();

        private Dictionary<JsonPointer, List<CompatibleXsdType>> _types;

        /// <summary>
        /// Construct a new instance of this type
        /// </summary>
        public JsonSchemaXsdMetadata()
        {
            _types = new Dictionary<JsonPointer, List<CompatibleXsdType>>();
        }

        /// <summary>
        /// Add compatible types to the give path
        /// </summary>
        /// <param name="path">the path to the element in JSON schema</param>
        /// <param name="type">The type(s) to add as compatible</param>
        public void AddCompatibleTypes(JsonPointer path, params CompatibleXsdType[] type)
        {

        }

        /// <summary>
        /// Remove compatible types from the give path
        /// </summary>
        /// <param name="path">the path to the element in JSON schema</param>
        /// <param name="type">The type(s) to remove as compatible</param>
        public void RemoveCompatibleTypes(JsonPointer path, params CompatibleXsdType[] type)
        {

        }

        /// <summary>
        /// Get the xsd types that are compatible with this JSON schema element
        /// </summary>
        /// <param name="path">The path to the element</param>
        /// <returns>A list of compatible types for the JSON schema element</returns>
        public IReadOnlyCollection<CompatibleXsdType> GetCompatibleTypes(JsonPointer path)
        {
            return _types.TryGetValue(path, out List<CompatibleXsdType> types) ? types.AsReadOnly() : _empty;
        } 
    }
}
