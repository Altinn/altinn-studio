using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Controllers.DataModelsController
{
    public class DatamodelsControllerTestsBase<TControllerTestType> : ApiTestsBase<DatamodelsController, TControllerTestType>, IDisposable
        where TControllerTestType : class
    {
        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
        protected string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public DatamodelsControllerTestsBase(WebApplicationFactory<DatamodelsController> factory) : base(factory)
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
