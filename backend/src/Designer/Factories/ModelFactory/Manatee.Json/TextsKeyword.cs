using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using Manatee.Json;
using Manatee.Json.Pointer;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;

namespace Altinn.Studio.Designer.Factories.ModelFactory.Manatee.Json
{
    /// <summary>
    /// Defines the <code>texts</code> JSON Schema keyword. Based on Manatee.Json.Schema.DefinitionsKeyword
    /// </summary>
    [DebuggerDisplay("Name={Name}; Count={Count}")]
    public class TextsKeyword : Dictionary<string, JsonSchema>, IJsonSchemaKeyword, IEquatable<TextsKeyword>
    {
        /// <summary>
        /// Gets the name of the keyword.
        /// </summary>
        public string Name => "texts";

        /// <summary>
        /// Gets the versions (drafts) of JSON Schema which support this keyword.
        /// </summary>
        public JsonSchemaVersion SupportedVersions { get; } = JsonSchemaVersion.All;

        /// <summary>
        /// Gets the a value indicating the sequence in which this keyword will be evaluated.
        /// </summary>
        public int ValidationSequence => 1;

        /// <summary>
        /// Gets schema vocabulary. Not implemented.
        /// </summary>
        /// <returns>SchemaVocabulary</returns>
        public SchemaVocabulary Vocabulary => throw new NotImplementedException();

        /// <summary>
        /// Provides the validation logic for this keyword.
        /// </summary>
        /// <param name="context">The context object.</param>
        /// <returns>Results object containing a final result and any errors that may have been found.</returns>
        public SchemaValidationResults Validate(SchemaValidationContext context)
        {
            return new SchemaValidationResults(Name, context);
        }

        /// <summary>
        /// Builds an object from a <see cref="JsonValue"/>.
        /// </summary>
        /// <param name="json">The <see cref="JsonValue"/> representation of the object.</param>
        /// <param name="serializer">The <see cref="JsonSerializer"/> instance to use for additional
        /// serialization of values.</param>
        public void FromJson(JsonValue json, JsonSerializer serializer)
        {
            throw new NotImplementedException();
        }

        /// <summary>
        /// Converts an object to a <see cref="JsonValue"/>.
        /// </summary>
        /// <param name="serializer">The <see cref="JsonSerializer"/> instance to use for additional
        /// serialization of values.</param>
        /// <returns>The <see cref="JsonValue"/> representation of the object.</returns>
        public JsonValue ToJson(JsonSerializer serializer)
        {
            return this.ToDictionary(
                kvp => kvp.Key, kvp => serializer.Serialize(kvp.Value))
                .ToJson();
        }

        /// <summary>Indicates whether the current object is equal to another object of the same type.</summary>
        /// <returns>true if the current object is equal to the <paramref name="other" /> parameter; otherwise, false.</returns>
        /// <param name="other">An object to compare with this object.</param>
        public bool Equals(TextsKeyword other)
        {
            if (other is null)
            {
                return false;
            }

            if (ReferenceEquals(this, other))
            {
                return true;
            }

            return GetCollectionHashCode(this).Equals(GetCollectionHashCode(other));
        }

        /// <summary>Indicates whether the current object is equal to another object of the same type.</summary>
        /// <returns>true if the current object is equal to the <paramref name="other" /> parameter; otherwise, false.</returns>
        /// <param name="other">An object to compare with this object.</param>
        public bool Equals(IJsonSchemaKeyword other)
        {
            return Equals(other as TextsKeyword);
        }

        /// <summary>Determines whether the specified object is equal to the current object.</summary>
        /// <returns>true if the specified object  is equal to the current object; otherwise, false.</returns>
        /// <param name="obj">The object to compare with the current object.</param>
        public override bool Equals(object obj)
        {
            return Equals(obj as TextsKeyword);
        }

        /// <summary>Serves as the default hash function. </summary>
        /// <returns>A hash code for the current object.</returns>
        public override int GetHashCode()
        {
            return GetCollectionHashCode(this);
        }

        /// <summary>Calculate hash code for collection. Copied from Manatee.Json.Internal</summary>
        /// <returns>hash code for the collection</returns>
        /// <param name="collection">The object to calculate hash code for.</param>
        public static int GetCollectionHashCode(IEnumerable<KeyValuePair<string, JsonSchema>> collection)
        {
            return collection.OrderBy(kvp => kvp.Key, StringComparer.Ordinal)
                             .Aggregate(0, (current, kvp) =>
                             {
                                 unchecked
                                 {
                                     var code = (current * 397) ^ kvp.Key.GetHashCode();
                                     code = (code * 397) ^ (kvp.Value?.GetHashCode() ?? 0);
                                     return code;
                                 }
                             });
        }

        /// <summary>
        /// Used register any subschemas during validation.  Enables look-forward compatibility with <code>$ref</code> keywords.
        /// </summary>
        /// <param name="context">The schema validation context.</param>
        public void RegisterSubschemas(SchemaValidationContext context)
        {
            foreach (JsonSchema schema in Values)
            {
                schema.RegisterSubschemas(context);
            }
        }

        /// <summary>
        /// Resolves any subschemas during resolution of a <code>$ref</code> during validation.
        /// </summary>
        /// <param name="pointer">A <see cref="JsonPointer"/> to the target schema.</param>
        /// <param name="baseUri">The current base URI.</param>
        /// <param name="supportedVersions">The supported JSON schema version.</param>
        /// <returns>The referenced schema, if it exists; otherwise null.</returns>
        public JsonSchema ResolveSubschema(JsonPointer pointer, Uri baseUri, JsonSchemaVersion supportedVersions)
        {
            var first = pointer.FirstOrDefault();
            if (first == null)
            {
                return null;
            }

            if (!TryGetValue(first, out var schema))
            {
                return null;
            }

            return schema.ResolveSubschema(new JsonPointer(pointer.Skip(1)), baseUri, JsonSchemaVersion.All);
        }
    }
}
