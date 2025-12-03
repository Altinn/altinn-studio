using System.IO;
using System.Text.Json;
using Altinn.Studio.Designer.Configuration;

namespace Designer.Tests.Controllers.ConfigController
{
    public static class ServiceConfigurationUtils
    {
        public static ServiceConfiguration GetServiceConfiguration(string basePath, string org, string app, string developer)
        {
            string path = Path.Combine(basePath, developer, org, app, "config.json");
            string config = File.ReadAllText(path);
            return JsonSerializer.Deserialize<ServiceConfiguration>(config, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        }
    }
}
