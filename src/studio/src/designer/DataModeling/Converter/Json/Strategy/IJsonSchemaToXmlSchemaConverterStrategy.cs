namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public interface IJsonSchemaToXmlSchemaConverterStrategy
    {
        /// <summary>
        /// Returns the JSON Schema analyzer used by this strategy
        /// </summary>
        /// <returns></returns>
        IJsonSchemaAnalyzer GetAnalyzer();

        /// <summary>
        /// Returns the JSON Schema converter used by this strategy
        /// </summary>
        /// <returns></returns>
        IJsonSchemaConverter GetConverter();
    }
}
