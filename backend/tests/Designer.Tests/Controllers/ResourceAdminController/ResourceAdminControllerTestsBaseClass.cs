﻿using System.Collections.Generic;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.Altinn2Metadata;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Designer.Tests.Controllers.ResourceAdminController
{
    public abstract class ResourceAdminControllerTestsBaseClass<TTesetClass> : DisagnerEndpointsTestsBase<Altinn.Studio.Designer.Controllers.ResourceAdminController, TTesetClass> where TTesetClass : class
    {
        protected readonly string VersionPrefix = "/designer/api";
        protected readonly Mock<IRepository> RepositoryMock;
        protected readonly Mock<IAltinn2MetadataClient> Altinn2MetadataClientMock;

        protected override void ConfigureTestServices(IServiceCollection services)
        {

            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddTransient(_ => RepositoryMock.Object);
            services.AddTransient(_ => Altinn2MetadataClientMock.Object);
        }

        protected ResourceAdminControllerTestsBaseClass(WebApplicationFactory<Altinn.Studio.Designer.Controllers.ResourceAdminController> factory) : base(factory)
        {
            RepositoryMock = new Mock<IRepository>();
            Altinn2MetadataClientMock = new Mock<IAltinn2MetadataClient>();
        }

        protected static List<ResourceReference> GetTestResourceReferences()
        {
            List<ResourceReference> resourceReferences = new List<ResourceReference>
            {
                new ResourceReference { Reference = string.Empty, ReferenceSource = ReferenceSource.Default, ReferenceType = ReferenceType.Default }
            };

            return resourceReferences;
        }

        protected static ServiceResource GetServiceResourceForValidationTest(bool valid)
        {
            if (valid)
            {
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = "ttdresource";
                serviceResource.Title = new Dictionary<string, string> { { "nb", "ttdTitle" } };
                serviceResource.Description = new Dictionary<string, string> { { "nb", "ttdDescription" } };
                serviceResource.ResourceType = ResourceType.Default;
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
                serviceResource.ThematicArea = string.Empty;
                return serviceResource;
            }
        }

        protected static List<ServiceResource> GetServiceResourcesForValidationTest(bool valid)
        {
            if (valid)
            {
                List<ServiceResource> resourceList = new List<ServiceResource>();
                ServiceResource serviceResource = new ServiceResource();
                serviceResource.Identifier = "ttdresource";
                serviceResource.Title = new Dictionary<string, string> { { "nb", "ttdTitle" } };
                serviceResource.Description = new Dictionary<string, string> { { "nb", "ttdDescription" } };
                serviceResource.ResourceType = ResourceType.Default;
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
                serviceResource.ThematicArea = string.Empty;
                resourceList.Add(serviceResource);
                return resourceList;
            }
        }

        protected static List<Keyword> GetTestKeywords()
        {
            List<Keyword> keywords = new List<Keyword>();
            Keyword keyword = new Keyword { Language = "No", Word = "test" };
            keywords.Add(keyword);
            return keywords;
        }
    }
}
