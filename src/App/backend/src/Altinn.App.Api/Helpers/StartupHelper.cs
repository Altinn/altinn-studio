#nullable disable
using System.Reflection;
using Newtonsoft.Json.Linq;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Static helper methods used in Program.cs during app startup
/// </summary>
public static class StartupHelper
{
    /// <summary>
    /// Delegate for swagger function
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
    /// Read application Id from config/applicationmetadata.json in the working directory
    /// </summary>
    /// <returns>ApplicationId</returns>
    public static string GetApplicationId() => GetApplicationId(Directory.GetCurrentDirectory());

    /// <summary>
    /// Read application Id from config/applicationmetadata.json in the app folder
    /// </summary>
    /// <param name="contentRootPath">The app folder, normally the content root of the host</param>
    /// <returns>ApplicationId</returns>
    public static string GetApplicationId(string contentRootPath)
    {
        string appMetaDataString = File.ReadAllText(Path.Join(contentRootPath, "config", "applicationmetadata.json"));
        JObject appMetadataJObject = JObject.Parse(appMetaDataString);
        return appMetadataJObject.SelectToken("id")?.Value<string>()
            ?? throw new Exception("config/applicationmetadata.json does not contain an \"id\" property");
    }
}
