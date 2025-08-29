namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class OrJsonSchemaConverterStrategy : IJsonSchemaConverterStrategy
    {
        /// <inheritdoc />
        public IJsonSchemaAnalyzer GetAnalyzer()
        {
            // Try to Analyse using GeneralJsonSchemaAnalyzer
            return new GeneralJsonSchemaAnalyzer();
        }

        /// <inheritdoc />
        public IJsonSchemaConverter GetConverter()
        {
            // Try to convert using GeneralJsonSchemaConverter
            return new GeneralJsonSchemaConverter();
        }
    }
}
