namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class GeneralJsonSchemaConverterStrategy : IJsonSchemaConverterStrategy
    {
        /// <inheritdoc />
        public IJsonSchemaAnalyzer GetAnalyzer()
        {
            return new GeneralJsonSchemaAnalyzer();
        }

        /// <inheritdoc />
        public IJsonSchemaConverter GetConverter()
        {
            return new GeneralJsonSchemaConverter();
        }
    }
}
