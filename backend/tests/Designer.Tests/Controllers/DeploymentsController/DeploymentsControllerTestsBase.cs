using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Designer.Tests.Controllers
{
    public class DeploymentsControllerTestsBase<TControllerTestType> : ApiTestsBase<DeploymentsController, TControllerTestType>, IDisposable
        where TControllerTestType : class
    {
        protected readonly JsonSerializerOptions Options;
        protected readonly Mock<IDeploymentService> DeploymentServiceMock;

        protected static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";
        protected string CreatedFolderPath { get; set; }

        public void Dispose()
        {
            if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
            {
                TestDataHelper.DeleteDirectory(CreatedFolderPath);
            }
        }

        public DeploymentsControllerTestsBase(WebApplicationFactory<DeploymentsController> factory) : base(factory)
        {
            Options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            Options.Converters.Add(new JsonStringEnumConverter());
            DeploymentServiceMock = new Mock<IDeploymentService>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_ => DeploymentServiceMock.Object);
        }
    }
}
