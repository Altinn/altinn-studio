using Altinn.Studio.AppConfig.Documents;

namespace Altinn.Studio.AppConfig.Validation.Schemas;

internal static class SchemaValidation
{
    public static IReadOnlyList<Finding> Collect(IAppDirectory dir, SchemaSet schemas)
    {
        var findings = new List<Finding>();
        foreach (var file in dir.EnumerateFiles("App", "*.json", recursive: true))
        {
            var data = dir.ReadAllBytes(file);
            if (data is not null)
                findings.AddRange(SchemaValidator.Validate(schemas, file, data));
        }
        return ValidationEngine.Normalize(findings);
    }
}
