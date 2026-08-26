#nullable disable
using System.Reflection;
using Newtonsoft.Json.Linq;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Static helper methods used in Program.cs during app startup
/// </summary>
public static class StartupHelper
{
    /// <summary>
    /// Delegate for swagger funciton
    /// </summary>
    public delegate void SwaggerIncludeXmlComments(string filepath, bool a);

    /// <summary>
    /// Includes comments in swagger based on XML comment files
    /// </summary>
    /// <param name="swaggerDelegate">Delegate for passing SwaggerGenOptions.IncludeXmlComments function</param>
    public static void IncludeXmlComments(SwaggerIncludeXmlComments swaggerDelegate)
    {
        try
        {
            string fileName = $"{Assembly.GetCallingAssembly().GetName().Name}.xml";
            string fullFilePath = Path.Join(AppContext.BaseDirectory, fileName);
            if (File.Exists(fullFilePath))
                swaggerDelegate(fullFilePath, false);
            string fullFilePathApi = Path.Join(AppContext.BaseDirectory, "Altinn.App.Api.xml");
            if (File.Exists(fullFilePathApi))
                swaggerDelegate(fullFilePathApi, false);
        }
        catch (Exception)
        {
            // Swagger documentation not generated
        }
    }

    /// <summary>
    /// Disambiguates Swagger schema ids for types that share a class name across namespaces.
    /// Specifically: <see cref="Altinn.Platform.Profile.Models.UserProfile"/> (exposed as-is by
    /// <c>ProfileController</c>) still embeds the legacy <c>Altinn.Platform.Register.Models</c>/
    /// <c>Altinn.Platform.Register.Enums</c> party types, while the rest of the API uses the
    /// corresponding <c>Altinn.Register.Contracts.V1</c> types — same class names, different
    /// namespaces, which Swashbuckle's default (short-name) schema id would otherwise collide on.
    /// </summary>
    /// <param name="options">The <see cref="SwaggerGenOptions"/> to configure.</param>
    public static void UseDisambiguatingSchemaIds(SwaggerGenOptions options)
    {
        options.CustomSchemaIds(type =>
            type.Namespace switch
            {
                "Altinn.Platform.Register.Models" => "Legacy" + type.Name,
                "Altinn.Platform.Register.Enums" => "Legacy" + type.Name,
                _ => type.Name,
            }
        );
    }

    /// <summary>
    /// Read application Id from config/applicationmetadata.json
    /// </summary>
    /// <returns>ApplicationId</returns>
    public static string GetApplicationId()
    {
        string appMetaDataString = File.ReadAllText("config/applicationmetadata.json");
        JObject appMetadataJObject = JObject.Parse(appMetaDataString);
        return appMetadataJObject.SelectToken("id")?.Value<string>()
            ?? throw new Exception("config/applicationmetadata.json does not contain an \"id\" property");
    }
}
