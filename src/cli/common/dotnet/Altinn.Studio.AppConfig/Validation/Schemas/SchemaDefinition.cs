namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal sealed record SchemaDefinition(string SchemaPath, string Name, string ValidatedFile)
{
    public string Key => $"{SchemaPath}#/definitions/{Name}";
}
