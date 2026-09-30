using System.Text.Json;
using Altinn.Studio.AppConfig.Documents;
using Altinn.Studio.AppConfig.Models;

namespace Altinn.Studio.AppConfig.Parsers;

internal static class ValidationConfigParser
{
    public static void Parse(AppModelBuilder app, IAppDirectory dir)
    {
        const string modelsDir = "App/models";
        if (!dir.DirectoryExists(modelsDir))
            return;
        foreach (var file in dir.EnumerateFiles(modelsDir, "*.validation.json", recursive: false))
        {
            var data = dir.ReadAllBytes(file);
            if (data is null)
                continue;
            JsonDocument doc;
            try
            {
                doc = JsonRead.ParseAppFile(data);
            }
            catch (JsonException)
            {
                continue;
            }
            using (doc)
                StringLiteralCollector.Collect(app.StringLiterals, doc.RootElement);
        }
    }
}
