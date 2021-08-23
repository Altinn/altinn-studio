using System.Collections.Generic;
using Json.Pointer;

namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Contains information about the Json Schema as relates to an xsd schema
    /// </summary>
    public class JsonSchemaXsdMetadata
    {
        private static readonly ISet<CompatibleXsdType> Empty = new HashSet<CompatibleXsdType>();

        private readonly Dictionary<JsonPointer, HashSet<CompatibleXsdType>> _types;
        private readonly Dictionary<JsonPointer, HashSet<CompatibleXsdType>> _incompatibleTypes;

        /// <summary>
        /// Placeholder
        /// </summary>
        public string MessageName { get; set; }

        /// <summary>
        /// Placeholder
        /// </summary>
        public string MessageTypeName { get; set; }

        /// <summary>
        /// Is the content of the schema directly in root or does it refer to an element in $defs/definitions
        /// </summary>
        public bool HasInlineRoot { get; set; }

        /// <summary>
        /// Construct a new instance of this type
        /// </summary>
        public JsonSchemaXsdMetadata()
        {
            _types = new Dictionary<JsonPointer, HashSet<CompatibleXsdType>>();
            _incompatibleTypes = new Dictionary<JsonPointer, HashSet<CompatibleXsdType>>();
        }

        /// <summary>
        /// Add compatible types to the give path
        /// </summary>
        /// <param name="path">the path to the element in JSON schema</param>
        /// <param name="types">The type(s) to add as compatible</param>
        public void AddCompatibleTypes(JsonPointer path, params CompatibleXsdType[] types)
        {
            if (!_types.TryGetValue(path, out var compatibleTypes))
            {
                compatibleTypes = new HashSet<CompatibleXsdType>();
                _types.Add(path, compatibleTypes);
            }

            foreach (var type in types)
            {
                compatibleTypes.Add(type);
            }
        }

        /// <summary>
        /// Add incompatible types to the give path.
        /// </summary>
        /// <param name="path">the path to the element in JSON schema</param>
        /// <param name="types">The type(s) to add as incompatible</param>
        public void AddIncompatibleTypes(JsonPointer path, params CompatibleXsdType[] types)
        {
            if (!_incompatibleTypes.TryGetValue(path, out var incompatibleTypes))
            {
                incompatibleTypes = new HashSet<CompatibleXsdType>();
                _incompatibleTypes.Add(path, incompatibleTypes);
            }

            foreach (var type in types)
            {
                incompatibleTypes.Add(type);
            }
        }

        /// <summary>
        /// Remove compatible types from the give path
        /// </summary>
        /// <param name="path">the path to the element in JSON schema</param>
        /// <param name="types">The type(s) to remove as compatible</param>
        public void RemoveCompatibleTypes(JsonPointer path, params CompatibleXsdType[] types)
        {
            if (!_types.TryGetValue(path, out var compatibleTypes))
            {
                return;
            }

            foreach (var type in types)
            {
                compatibleTypes.Remove(type);
            }
        }

        /// <summary>
        /// Get the xsd types that are compatible with this JSON schema element
        /// </summary>
        /// <param name="path">The path to the element</param>
        /// <returns>A list of compatible types for the JSON schema element</returns>
        public ISet<CompatibleXsdType> GetCompatibleTypes(JsonPointer path)
        {
            return _types.TryGetValue(path, out HashSet<CompatibleXsdType> types) ? types : Empty;
        }
    }
}
