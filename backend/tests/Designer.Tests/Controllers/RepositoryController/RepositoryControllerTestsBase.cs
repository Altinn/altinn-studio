using System;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class RepositoryControllerTestsBase<TControllerTestType> : ApiTestsBase<Altinn.Studio.Designer.Controllers.RepositoryController, TControllerTestType>, IDisposable
        where TControllerTestType : class
    {
        protected static string VersionPrefix => "/designer/api/repos";
        protected string CreatedFolderPath { get; set; }
        protected string CreatedSecondaryFolderPath { get; set; }
        protected readonly Mock<IRepository> RepositoryMock;

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
            if (!string.IsNullOrWhiteSpace(CreatedSecondaryFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedSecondaryFolderPath);
            }
        }

        public RepositoryControllerTestsBase(WebApplicationFactory<Altinn.Studio.Designer.Controllers.RepositoryController> factory) : base(factory)
        {
            RepositoryMock = new Mock<IRepository>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => RepositoryMock.Object);
        }
    }
}
