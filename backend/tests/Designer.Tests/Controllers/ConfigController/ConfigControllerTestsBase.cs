using System;
using System.IO;
using System.Text.Json;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Controllers.ConfigController
{
    public class ConfigControllerTestsBase<TControllerTestType> : ApiTestsBase<Altinn.Studio.Designer.Controllers.ConfigController, TControllerTestType>, IDisposable
    where TControllerTestType : class
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/config";
        protected string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public ConfigControllerTestsBase(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ConfigController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }

        protected static ServiceConfiguration GetServiceConfiguration(string org, string app)
        {
            string path = Path.Combine(TestRepositoriesLocation, "testUser", org, app, "config.json");
            string config = File.ReadAllText(path);
            return JsonSerializer.Deserialize<ServiceConfiguration>(config, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        }

    }
}
