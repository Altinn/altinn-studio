using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Controllers.TextsController
{
    public class TextsControllerTestsBase<TControllerTestType> : ApiTestsBase<Altinn.Studio.Designer.Controllers.TextsController, TControllerTestType>, IDisposable
        where TControllerTestType : class
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/texts";
        protected string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public TextsControllerTestsBase(WebApplicationFactory<Altinn.Studio.Designer.Controllers.TextsController> factory) : base(factory)
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
