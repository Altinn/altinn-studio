using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.ResourceRegistry.Core.Models.Altinn2;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata;
using Altinn.Studio.PolicyAdmin.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions.Common;
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
        private readonly Mock<IAltinn2MetadataClient> _altinn2MetadataClientMock;

        public ResourceAdminControllerTests(WebApplicationFactory<ResourceAdminController> factory) : base(factory)
        {
            _repositoryMock = new Mock<IRepository>();
            _altinn2MetadataClientMock = new Mock<IAltinn2MetadataClient>();
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => _repositoryMock.Object);
            services.AddTransient(_ => _altinn2MetadataClientMock.Object);
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

        [Fact]
        public async Task ExportAltinn2Resource()
        {
            // Arrange
            string uri = $"designer/api/ttd/resources/importresource/4485/4444/at23";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);


            ServiceResource serviceResource = new ServiceResource()
            {
                Identifier = "234",
            };

            XacmlPolicy policy = AuthorizationUtil.ParsePolicy("resource_registry_delegatableapi.xml");

            _altinn2MetadataClientMock.Setup(r => r.GetServiceResourceFromService(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(serviceResource);
            _altinn2MetadataClientMock.Setup(r => r.GetXacmlPolicy(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string>())).ReturnsAsync(policy);

            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string contenthtml = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        }


        [Fact]
        public async Task GetFilteredLinkServices()
        {
            // Arrange
            string uri = $"designer/api/brg/resources/altinn2linkservices/at23";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            List<AvailableService> services = new List<AvailableService>();
            services.Add(new AvailableService()
            {
                ServiceName = "Test",
                ExternalServiceCode = "Test",
                ExternalServiceEditionCode = 123
                 
            });
            services.Add(new AvailableService()
            {
                ServiceName = "Test 2",
                ExternalServiceCode = "Test2",
                ExternalServiceEditionCode = 123
            });

            _altinn2MetadataClientMock.Setup(r => r.AvailableServices(It.IsAny<int>(), It.IsAny<string>())).ReturnsAsync(services);
      
            // Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string contenthtml = await res.Content.ReadAsStringAsync();

            // Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
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


        [Fact]
        public async Task GetSectors()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/sectors";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string sectorscontent = await res.Content.ReadAsStringAsync();
            List<DataTheme> dataThemes = System.Text.Json.JsonSerializer.Deserialize<List<DataTheme>>(sectorscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            //Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotEmpty(dataThemes);
        }

        [Fact]
        public async Task GetLosTerms()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/losterms";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string sectorscontent = await res.Content.ReadAsStringAsync();
            List<LosTerm> losTerms = System.Text.Json.JsonSerializer.Deserialize<List<LosTerm>>(sectorscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            //Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotEmpty(losTerms);
        }

        [Fact]
        public async Task GetEuroVocs()
        {
            //Arrange
            string uri = $"{_versionPrefix}/ttd/resources/eurovoc";
            HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, uri);

            //Act
            HttpResponseMessage res = await HttpClient.Value.SendAsync(httpRequestMessage).ConfigureAwait(false);
            string eurovocscontent = await res.Content.ReadAsStringAsync();
            List<EuroVocTerm> eurovocs = System.Text.Json.JsonSerializer.Deserialize<List<EuroVocTerm>>(eurovocscontent, new System.Text.Json.JsonSerializerOptions() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            //Assert
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.NotEmpty(eurovocs);
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
