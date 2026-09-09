namespace Altinn.Studio.DataModeling.Converter.Json.Strategy;

/// <summary>
/// Placeholder
/// </summary>
public class OrJsonSchemaConverterStrategy : IJsonSchemaConverterStrategy
{
    /// <inheritdoc />
    public IJsonSchemaAnalyzer GetAnalyzer()
    {
        // Try to Analyze using GeneralJsonSchemaAnalyzer
        return new GeneralJsonSchemaAnalyzer();
    }

    /// <inheritdoc />
    public IJsonSchemaConverter GetConverter()
    {
        // Try to convert using GeneralJsonSchemaConverter
        return new GeneralJsonSchemaConverter();
    }
}
