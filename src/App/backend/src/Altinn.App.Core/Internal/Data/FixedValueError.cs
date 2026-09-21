namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Describes a property in a data model whose value differs from the fixed value declared in the model class.
/// </summary>
/// <remarks>
/// A property is considered fixed when it has <c>[BindNever]</c> and a literal initializer, such as
/// <c>[XmlAttribute("dataFormatVersion")] [BindNever] public string dataFormatVersion { get; set; } = "1";</c>.
/// Altinn Studio generates such properties for XSD attributes with a <c>fixed</c> value.
/// </remarks>
/// <param name="Path">Dotted path to the property, with JSON property names for the containing objects and collection indexes in brackets</param>
/// <param name="ExpectedValue">The fixed value declared in the model class</param>
/// <param name="ActualValue">The value found in the data model</param>
public sealed record FixedValueError(string Path, string? ExpectedValue, string? ActualValue)
{
    /// <summary>
    /// Human readable description of the mismatch
    /// </summary>
    public override string ToString() =>
        $"Property \"{Path}\" has the fixed value \"{ExpectedValue}\", but was \"{ActualValue}\"";
}
