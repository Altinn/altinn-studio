using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.Models;
using AltinnCore.Runtime.RestControllers;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Services.Interfaces;

using AltinnCoreServiceImplementation.tdd.xyz23;

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Storage.Interface.Models;
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// Represents a collection of unit tests for the <see cref="ValidateController"/>.
    /// </summary>
    public class ValidateControllerTest
    {
        private readonly string org = "test";
        private readonly string app = "app";
        private readonly int instanceOwnerId = 50505;
        private readonly int partyId = 50505;
        private readonly int userId = 40404;
        private readonly Guid instanceGuid = Guid.Parse("4e416b68-32e5-47c3-bef8-4850d9d993b2");
        private readonly Guid dataGuid = Guid.Parse("16b62641-67b1-4cf0-b26f-61279fbf528d");
        private readonly string repoPath = "../../../Runtime/ServiceModels/default";

        /// <summary>
        /// Test that target can validate a simple instance.
        /// </summary>
        /// <returns>Returns nothing</returns>
        [Fact]
        public async Task ValidateInstance_Validation_ReturnsNoError()
        {
            // Arrange
            Application application = new Application
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>
                {
                    new ElementType
                    {
                        Id = "default",
                        AppLogic = true,
                        AllowedContentType = new List<string> { "application/xml" },
                        Task = "FormFilling_1"
                    }
                }
            };

            Instance getInstance = new Instance
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { AltinnTaskType = "FormFilling", ElementId = "FormFilling_1" }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                        StorageUrl = "www.storageuri.com",
                        ContentType = "application/xml"
                    }
                }
            };

            Skjema model = new Skjema();

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(getInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetFormData(It.IsAny<Guid>(), It.IsAny<Type>(), org, app, instanceOwnerId, It.IsAny<Guid>()))
                .Returns(model);

            ValidateController target = NewValidateController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            // Act
            IActionResult result = await target.ValidateInstance(org, app, instanceOwnerId, instanceGuid);

            OkObjectResult actual = result as OkObjectResult;

            // Arrange
            Assert.NotNull(actual);

            List<ValidationIssue> validationIssues = actual.Value as List<ValidationIssue>;
            Assert.NotNull(validationIssues);
            Assert.Empty(validationIssues);
        }

        /// <summary>
        /// Test that target can validate a simple data element.
        /// </summary>
        /// <returns>Returns nothing</returns>
        [Fact]
        public async Task ValidateData_Validation_ReturnsNoError()
        {
            // Arrange
            Application application = new Application
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>
                {
                    new ElementType
                    {
                        Id = "default",
                        AppLogic = true,
                        AllowedContentType = new List<string> { "application/xml" },
                        Task = "FormFilling_1"
                    }
                }
            };

            Instance getInstance = new Instance
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { AltinnTaskType = "FormFilling", ElementId = "FormFilling_1" }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                        StorageUrl = "www.storageuri.com",
                        ContentType = "application/xml"
                    }
                }
            };

            Skjema model = new Skjema();

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(getInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetFormData(It.IsAny<Guid>(), It.IsAny<Type>(), org, app, instanceOwnerId, It.IsAny<Guid>()))
                .Returns(model);

            ValidateController target = NewValidateController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            // Act
            IActionResult result = await target.ValidateData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            OkObjectResult actual = result as OkObjectResult;

            // Arrange
            Assert.NotNull(actual);

            List<ValidationIssue> validationIssues = actual.Value as List<ValidationIssue>;
            Assert.NotNull(validationIssues);
            Assert.Empty(validationIssues);
        }

        /// <summary>
        /// Test that target can validate a simple data element.
        /// </summary>
        /// <returns>Returns nothing</returns>
        [Fact]
        public async Task ValidateData_ModelStateIsInvalid_ReturnsErrorMessage()
        {
            // Arrange
            Application application = new Application
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>
                {
                    new ElementType
                    {
                        Id = "default",
                        AppLogic = true,
                        AllowedContentType = new List<string> { "application/xml" },
                        Task = "FormFilling_1"
                    }
                }
            };

            Instance instance = new Instance
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,
                Process = new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { AltinnTaskType = "FormFilling", ElementId = "FormFilling_1" }
                },
                Data = new List<DataElement>
                {
                    new DataElement
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                        StorageUrl = "www.storageuri.com",
                        ContentType = "application/xml"
                    }
                }
            };

            Skjema model = new Skjema();

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetFormData(It.IsAny<Guid>(), It.IsAny<Type>(), org, app, instanceOwnerId, It.IsAny<Guid>()))
                .Returns(model);

            ValidateController target = NewValidateController(context, instanceServiceMock, dataServiceMock, appServiceMock);
            target.ModelState.AddModelError("Field.this.or.that", "Something wrong with field.");

            // Act
            IActionResult result = await target.ValidateData(org, app, instanceOwnerId, instanceGuid, dataGuid);

            OkObjectResult actual = result as OkObjectResult;

            // Arrange
            Assert.NotNull(actual);

            List<ValidationIssue> validationIssues = actual.Value as List<ValidationIssue>;
            Assert.NotNull(validationIssues);
            Assert.Single(validationIssues);
        }

        private ValidateController NewValidateController(Mock<HttpContext> context, Mock<IInstance> instanceServiceMock, Mock<IData> dataServiceMock, Mock<IApplication> appServiceMock)
        {
            Mock<IRegister> registerServiceMock = new Mock<IRegister>();
            registerServiceMock
                .Setup(x => x.GetParty(It.IsAny<int>()))
                .Returns(Task.FromResult(new Party() { PartyId = partyId }));

            Mock<IProfile> profileServiceMock = new Mock<IProfile>();
            profileServiceMock
                .Setup(x => x.GetUserProfile(It.IsAny<int>()))
                .Returns(Task.FromResult(new UserProfile() { UserId = userId }));

            Mock<IOptions<GeneralSettings>> generalSettingsMock = new Mock<IOptions<GeneralSettings>>();
            generalSettingsMock.Setup(s => s.Value).Returns(new GeneralSettings()
            {
                AltinnPartyCookieName = "AltinnPartyId",
            });

            ServiceRepositorySettings serviceRepositorySettings = new ServiceRepositorySettings()
            {
                RepositoryLocation = repoPath,
            };

            Mock<ServiceContext> serviceContextMock = new Mock<ServiceContext>();
            Mock<IExecution> executionServiceMock = new Mock<IExecution>();
            executionServiceMock
                .Setup(e => e.GetServiceContext(org, app, It.IsAny<bool>()))
                .Returns(serviceContextMock.Object);

            ServiceImplementation serviceImplementation = new ServiceImplementation();
            executionServiceMock
                .Setup(e => e.GetServiceImplementation(org, app, It.IsAny<bool>()))
                .Returns(serviceImplementation);

            Mock<IPlatformServices> platformServicesMock = new Mock<IPlatformServices>();

            Mock<IObjectModelValidator> objectValidator = new Mock<IObjectModelValidator>();
            objectValidator.Setup(o => o.Validate(
                It.IsAny<ActionContext>(),
                It.IsAny<ValidationStateDictionary>(),
                It.IsAny<string>(),
                It.IsAny<object>()));

            ValidateController validateController = new ValidateController(
                generalSettingsMock.Object,
                registerServiceMock.Object,
                instanceServiceMock.Object,
                dataServiceMock.Object,
                executionServiceMock.Object,
                profileServiceMock.Object,
                platformServicesMock.Object,
                new Mock<IInstanceEvent>().Object,
                appServiceMock.Object)
            {
                ControllerContext = new ControllerContext()
                {
                    HttpContext = context.Object,
                },

                ObjectValidator = objectValidator.Object,
            };

            return validateController;
        }

        private Mock<HttpRequest> MockRequest()
        {
            Mock<HttpRequest> request = new Mock<HttpRequest>();
            request.SetupGet(x => x.Headers["Accept"]).Returns("application/json");
            request.SetupGet(x => x.Host).Returns(new HostString($"{org}.apps.at21.altinn.cloud"));
            request.SetupGet(x => x.Path).Returns(new PathString($"/{org}/{app}/instances/"));
            request.SetupGet(x => x.Cookies["AltinnPartyId"]).Returns(partyId.ToString());
            return request;
        }

        private Mock<ClaimsPrincipal> MockUser()
        {
            string issuer = "https://altinn.no";
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.UserId, userId.ToString(), ClaimValueTypes.Integer, issuer));
            claims.Add(new Claim(AltinnCoreClaimTypes.AuthenticationLevel, "1", ClaimValueTypes.Integer, issuer));

            var userMock = new Mock<ClaimsPrincipal>();
            userMock.Setup(p => p.Claims).Returns(claims);
            return userMock;
        }
    }
}
