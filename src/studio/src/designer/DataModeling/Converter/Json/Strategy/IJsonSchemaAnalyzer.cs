using System;
using Json.Schema;

namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Class for analyzing a Json Schema with regards to how various constructs should
    /// be serialized to XSD.
    /// </summary>
    public interface IJsonSchemaAnalyzer
    {
        /// <summary>
        /// Analyze the schema and return relevant metadata for the conversion process
        /// </summary>
        /// <param name="schema">The schema to analyze</param>
        /// <param name="uri">Absolute <see cref="Uri"/> to the schema.</param>
        /// <returns>The relevant metadata for the schema to convert properly</returns>
        JsonSchemaXsdMetadata AnalyzeSchema(JsonSchema schema, Uri uri);
    }
}
