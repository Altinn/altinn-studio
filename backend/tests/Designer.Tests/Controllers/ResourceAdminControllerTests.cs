using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace Designer.Tests.Controllers
{
    public class ResourceAdminControllerTests : ApiTestsBase<ResourceAdminController, ResourceAdminControllerTests>
    {
        private readonly string _versionPrefix = "/designer/api";
        private readonly Mock<IRepository> _repositoryMock;

        public ResourceAdminControllerTests(WebApplicationFactory<ResourceAdminController> factory) : base(factory)
        {
            _repositoryMock = new Mock<IRepository>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => _repositoryMock.Object);
        }

        [Fact]
        public async Task GetResourceRepository_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/resources";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceRepository_NoContent()
        {
            // Arrange
            string uri = $"{_versionPrefix}/orgwithoutrepo/resources";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceList_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/resources/resourcelist";

            _repositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<ServiceResource>
                {
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        ValidFrom = new System.DateTime(),
                        ValidTo = new System.DateTime(),
                        IsPartOf = string.Empty,
                        IsPublicService = true,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        IsComplete = true,
                        Delegable = true,
                        Visible = true,
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        Sector = new List<string>(),
                        ResourceType = ResourceType.Default,
                        MainLanguage = "en-US",
                    }
                });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceList_NoContent()
        {
            // Arrange
            string uri = $"{_versionPrefix}/orgwithoutrepo/resources/resourcelist";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            _repositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<ServiceResource>());

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceAdmIndexOK()
        {
            // Arrange
            string uri = $"/resourceadm/ttd/resources";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string contenthtml = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Contains("resourceadm.js", contenthtml);
        }



        private static List<Keyword> GetTestKeywords()
        {
            List<Keyword> keywords = new List<Keyword>();
            Keyword keyword = new Keyword { Language = "No", Word = "test" };
            keywords.Add(keyword);
            return keywords;
        }

        [Fact]
        public async Task GetResourceById_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/resources/ttd-resources/ttd_testresource";

            _repositoryMock
                .Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        ValidFrom = new System.DateTime(),
                        ValidTo = new System.DateTime(),
                        IsPartOf = string.Empty,
                        IsPublicService = true,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        IsComplete = true,
                        Delegable = true,
                        Visible = true,
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        Sector = new List<string>(),
                        ResourceType = ResourceType.Default,
                        MainLanguage = "en-US",
                    });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_Passing_Repository_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/resources/ttd-app-resources";

            _repositoryMock
                .Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(new List<ServiceResource>
                {
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        ValidFrom = new System.DateTime(),
                        ValidTo = new System.DateTime(),
                        IsPartOf = string.Empty,
                        IsPublicService = true,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        IsComplete = true,
                        Delegable = true,
                        Visible = true,
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        Sector = new List<string>(),
                        ResourceType = ResourceType.Default,
                        MainLanguage = "en-US",
                    }
                });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceStatusById_Passing_Repository_OK()
        {
            // Arrange
            string uri = $"{_versionPrefix}/ttd/resources/publishstatus/ttd-resources/ttd_testresource";

            _repositoryMock
                .Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
                .Returns(
                    new ServiceResource
                    {
                        Identifier = "testresource",
                        Title = new Dictionary<string, string>(),
                        Description = new Dictionary<string, string>(),
                        RightDescription = new Dictionary<string, string>(),
                        Homepage = "test.no",
                        Status = string.Empty,
                        ValidFrom = new System.DateTime(),
                        ValidTo = new System.DateTime(),
                        IsPartOf = string.Empty,
                        IsPublicService = true,
                        ThematicArea = string.Empty,
                        ResourceReferences = GetTestResourceReferences(),
                        IsComplete = true,
                        Delegable = true,
                        Visible = true,
                        Version = "2023.12",
                        HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                        Keywords = GetTestKeywords(),
                        Sector = new List<string>(),
                        ResourceType = ResourceType.Default,
                        MainLanguage = "en-US",
                    });

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        }


        [Fact]
        public async Task GetResourceById_NoContent()
        {
            // Arrange
            string uri = $"{_versionPrefix}/orgwithoutrepo/resources/ttd-resources/ttd_test_resource";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_Passing_Repository_NoContent()
        {
            // Arrange
            string uri = $"{_versionPrefix}/orgwithoutrepo/resources/ttd-resources";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task GetResourceById_PassingNoValidArgument_NoContent()
        {
            // Arrange
            string uri = $"{_versionPrefix}/orgwithoutrepo/resources/orgwithoutrepo-resources/notvalidresource";

            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
        }

        [Fact]
        public async Task UpdateServiceResource_StatusCreated()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/updateresource/resource1";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, uri);

            ServiceResource serviceResource = new ServiceResource
            {
                Identifier = "resource1",
                Title = new Dictionary<string, string> { { "en", "resourcetest" }, { "no", "ressurstest" } },
                Description = new Dictionary<string, string> { { "en", "test of resourceadminController" }, { "no", "test av resourceAdminController" } },
                RightDescription = new Dictionary<string, string> { { "en", "Access Management" }, { "no", "Tilgangsstyring" } },
                Homepage = "test.no",
                Status = "Active",
                ValidFrom = new System.DateTime(2023, 12, 10, 12, 0, 0),
                ValidTo = new System.DateTime(2025, 12, 10, 12, 0, 0),
                IsPartOf = "Altinn",
                IsPublicService = true,
                ThematicArea = "",
                ResourceReferences = GetTestResourceReferences(),
                IsComplete = true,
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                Keywords = GetTestKeywords(),
                Sector = new List<string> { "private", "public" },
                ResourceType = ResourceType.Default,
                MainLanguage = "en-US",
            };

            _repositoryMock.Setup(r => r.UpdateServiceResource(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<ServiceResource>())).Returns(new StatusCodeResult(201));
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(serviceResource), System.Text.Encoding.UTF8, "application/json");

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task AddServiceResource_StatusCreated()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/addresource";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            ServiceResource serviceResource = new ServiceResource
            {
                Identifier = "resource1",
                Title = new Dictionary<string, string> { { "en", "resourcetest" }, { "no", "ressurstest" } },
                Description = new Dictionary<string, string> { { "en", "test of resourceadminController" }, { "no", "test av resourceAdminController" } },
                RightDescription = new Dictionary<string, string> { { "en", "Access Management" }, { "no", "Tilgangsstyring" } },
                Homepage = "test.no",
                Status = "Active",
                ValidFrom = new System.DateTime(2023, 12, 10, 12, 0, 0),
                ValidTo = new System.DateTime(2025, 12, 10, 12, 0, 0),
                IsPartOf = "Altinn",
                IsPublicService = true,
                ThematicArea = "",
                ResourceReferences = GetTestResourceReferences(),
                IsComplete = true,
                Delegable = true,
                Visible = true,
                HasCompetentAuthority = new CompetentAuthority { Organization = "ttd", Orgcode = "test", Name = new Dictionary<string, string>() },
                Keywords = GetTestKeywords(),
                Sector = new List<string> { "private", "public" },
                ResourceType = ResourceType.Default,
                MainLanguage = "en-US",
            };

            _repositoryMock.Setup(r => r.AddServiceResource(It.IsAny<string>(), It.IsAny<ServiceResource>())).Returns(new StatusCodeResult(201));
            httpRequestMessage.Content = new StringContent(JsonConvert.SerializeObject(serviceResource), System.Text.Encoding.UTF8, "application/json");

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResourceById_IsValid()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/validate/ttd-resources/ttdresource";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            _repositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourceForValidationTest(true));

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResourceById_IsInValid()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/validate/ttd-resources/ttdresource";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            _repositoryMock.Setup(r => r.GetServiceResourceById(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourceForValidationTest(false));

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResource_IsValid()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/validate/ttd-resources";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            _repositoryMock.Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourcesForValidationTest(true));

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        [Fact]
        public async Task ValidateServiceResource_IsInValid()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/validate/ttd-resources";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            _repositoryMock.Setup(r => r.GetServiceResources(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>())).Returns(GetServiceResourcesForValidationTest(false));

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);

            //Assert
            _repositoryMock.VerifyAll();
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }

        private static List<ResourceReference> GetTestResourceReferences()
        {
            List<ResourceReference> resourceReferences = new List<ResourceReference>
            {
                new ResourceReference { Reference = string.Empty, ReferenceSource = ReferenceSource.Default, ReferenceType = ReferenceType.Default }
            };

            return resourceReferences;
        }

        private static ServiceResource GetServiceResourceForValidationTest(bool valid)
        {
            if (valid)
            {
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = "ttdresource";
                serviceResource.Title = new Dictionary<string, string> { { "nb", "ttdTitle" } };
                serviceResource.Description = new Dictionary<string, string> { { "nb", "ttdDescription" } };
                serviceResource.ResourceType = ResourceType.Default;
                serviceResource.IsComplete = true;
                serviceResource.ThematicArea = "ttdThematicArea";
                return serviceResource;
            }
            else
            {
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = null;
                serviceResource.Title = null;
                serviceResource.Description = null;
                serviceResource.ResourceType = ResourceType.Default;
                serviceResource.IsComplete = false;
                serviceResource.ThematicArea = string.Empty;
                return serviceResource;
            }
        }

        private static List<ServiceResource> GetServiceResourcesForValidationTest(bool valid)
        {
            if (valid)
            {
                List<ServiceResource> resourceList = new List<ServiceResource>();
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = "ttdresource";
                serviceResource.Title = new Dictionary<string, string> { { "nb", "ttdTitle" } };
                serviceResource.Description = new Dictionary<string, string> { { "nb", "ttdDescription" } };
                serviceResource.ResourceType = ResourceType.Default;
                serviceResource.IsComplete = true;
                serviceResource.ThematicArea = "ttdThematicArea";
                resourceList.Add(serviceResource);
                return resourceList;
            }
            else
            {
                List<ServiceResource> resourceList = new List<ServiceResource>();
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = null;
                serviceResource.Title = null;
                serviceResource.Description = null;
                serviceResource.ResourceType = ResourceType.Default;
                serviceResource.IsComplete = false;
                serviceResource.ThematicArea = string.Empty;
                resourceList.Add(serviceResource);
                return resourceList;
            }
        }
    }
}
