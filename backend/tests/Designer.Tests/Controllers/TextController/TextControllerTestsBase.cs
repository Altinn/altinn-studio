using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Controllers.TestController
{
    public class TextControllerTestsBase<TControllerTestType> : ApiTestsBase<Altinn.Studio.Designer.Controllers.TextController, TControllerTestType>, IDisposable
        where TControllerTestType : class
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/text";
        protected string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public TextControllerTestsBase(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextController> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
        }
    }
}
