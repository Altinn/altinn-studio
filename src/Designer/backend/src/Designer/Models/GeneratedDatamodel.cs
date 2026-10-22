namespace Altinn.Studio.Designer.Models;

/// <summary>
/// The files of a data model in an app repository, as Designer saves them.
/// </summary>
/// <param name="JsonSchema">The contents of the data model's <c>.schema.json</c> file.</param>
/// <param name="CsharpClasses">The contents of the data model's <c>.cs</c> file.</param>
/// <param name="Xsd">The contents of the data model's <c>.xsd</c> file.</param>
/// <param name="ApplicationMetadata">The contents of <c>App/config/applicationmetadata.json</c>.</param>
public sealed record GeneratedDatamodel(
    string JsonSchema,
    string CsharpClasses,
    string Xsd,
    string ApplicationMetadata
);
