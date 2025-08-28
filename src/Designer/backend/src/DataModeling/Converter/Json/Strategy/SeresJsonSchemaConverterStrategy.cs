namespace Altinn.Studio.DataModeling.Converter.Json.Strategy
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public class SeresJsonSchemaConverterStrategy : IJsonSchemaConverterStrategy
    {
        /// <inheritdoc />
        public IJsonSchemaAnalyzer GetAnalyzer()
        {
            return new SeresJsonSchemaAnalyzer();
        }

        /// <inheritdoc />
        public IJsonSchemaConverter GetConverter()
        {
            return new GeneralJsonSchemaConverter();
        }
    }
}
