using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Altinn.Platform.Storage.Models;
using AltinnCore.Authentication.Constants;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Interfaces;
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
using Xunit;

namespace AltinnCore.UnitTest.Runtime
{
    /// <summary>
    /// testing for datacontroller
    /// </summary>
    public class DataControllerTest
    {
        private readonly string org = "test";
        private readonly string app = "app";
        private readonly int instanceOwnerId = 50505;
        private readonly int partyId = 50505;
        private readonly int userId = 40404;
        private readonly Guid instanceGuid = Guid.Parse("4e416b68-32e5-47c3-bef8-4850d9d993b2");
        private readonly Guid dataGuid = Guid.Parse("16b62641-67b1-4cf0-b26f-61279fbf528d");
        private readonly string elementType = "default";
        private readonly string repoPath = "../../../Runtime/ServiceModels/default";

        /// <summary>
        /// Test creation of a data element.
        /// </summary>
        [Fact]
        public void PostDataElement()
        {
            /* SETUP */

            Instance getInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,
            };

            Instance updatedInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                    }
                }
            };

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(getInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.InsertData(It.IsAny<object>(), It.IsAny<Guid>(), It.IsAny<Type>(), org, app, instanceOwnerId))
                .Returns(Task.FromResult(updatedInstance));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock);

            /* TEST */

            ActionResult result = dataController.CreateDataElement(org, app, instanceOwnerId, instanceGuid, elementType).Result;

            Assert.IsType<CreatedResult>(result);

            Instance instance = (Instance)((CreatedResult)result).Value;

            Assert.NotNull(instance);
            Assert.True(instance.Data.Any());
        }

        /// <summary>
        /// Gets a data element which is named.
        /// </summary>
        [Fact]
        public void GetDataElement()
        {
            /* SETUP */

            Instance instance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                    }
                }
            };

            Mock<HttpRequest> request = MockRequest();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            XmlSerializer serializer = new XmlSerializer(typeof(Skjema));
            object skjema = serializer.Deserialize(File.OpenRead("Runtime/data/data-element.xml"));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetFormData(instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId, dataGuid))
                .Returns(skjema);

            /* TEST */

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock);

            ActionResult result = dataController.GetDataElement(org, app, instanceOwnerId, instanceGuid, elementType).Result;

            Assert.IsType<OkObjectResult>(result);

            OkObjectResult okresult = result as OkObjectResult;
            Skjema model = (Skjema)okresult.Value;

            Assert.Equal(5800, model.gruppeid);
            Assert.Equal("Ærlige Øksne Åsheim", model.Skattyterinforgrp5801.Kontaktgrp5803.KontaktpersonNavndatadef2.value);
        }

        /// <summary>
        /// Gets a data element which is named.
        /// </summary>
        [Fact]
        public void GetDataElementWithDataGuid()
        {
            /* SETUP */

            Instance instance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                        ContentType = "application/xml",
                    }
                }
            };

            Mock<HttpRequest> request = MockRequest();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            Stream dataStream = File.OpenRead("Runtime/data/data-element.xml");

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetData(org, app, instanceOwnerId, instanceGuid, dataGuid))
                .Returns(Task.FromResult(dataStream));

            /* TEST */

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock);

            ActionResult result = dataController.Get(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<FileStreamResult>(result);

            FileStreamResult okresult = result as FileStreamResult;
            Stream resultStream = (Stream)okresult.FileStream;

            XmlSerializer serializer = new XmlSerializer(typeof(Skjema));
            Skjema model = (Skjema)serializer.Deserialize(resultStream);

            Assert.Equal(5800, model.gruppeid);
            Assert.Equal("Ærlige Øksne Åsheim", model.Skattyterinforgrp5801.Kontaktgrp5803.KontaktpersonNavndatadef2.value);
        }

        /// <summary>
        /// Updates a dataset happy days.
        /// </summary>
        [Fact]
        public void PutDataElement()
        {
            /* SETUP */

            Instance beforeInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    new DataElement()
                    {
                        Id = $"{dataGuid}",
                        ElementType = "default",
                    }
                }
            };

            Mock<HttpRequest> request = MockRequest();

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            
            request.SetupGet(x => x.Body).Returns(dataElement);
            request.SetupGet(x => x.ContentType).Returns("application/xml");

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(beforeInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();

            /* TEST */

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock);

            ActionResult result = dataController.PutDataElement(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<OkObjectResult>(result);
    
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

        private DataController NewDataController(Mock<HttpContext> context, Mock<IInstance> instanceServiceMock, Mock<IData> dataServiceMock)
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

            DataController dataController = new DataController(
                generalSettingsMock.Object,
                new Mock<ILogger<DataController>>().Object,
                registerServiceMock.Object,
                instanceServiceMock.Object,
                dataServiceMock.Object,
                executionServiceMock.Object,
                profileServiceMock.Object,
                platformServicesMock.Object,
                new Mock<IRepository>().Object,
                new Mock<IInstanceEvent>().Object)
            {
                ControllerContext = new ControllerContext()
                {
                    HttpContext = context.Object,
                },

                ObjectValidator = objectValidator.Object,
            };

            return dataController;
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

        private List<AltinnCoreFile> GetImplementationFiles()
        {
            List<AltinnCoreFile> coreFiles = new List<AltinnCoreFile>();
            string path = repoPath;

            string[] files = Directory.GetFiles(path + "/Implementation");
            foreach (string file in files)
            {
                AltinnCoreFile corefile = new AltinnCoreFile
                {
                    FilePath = file,
                    FileName = Path.GetFileName(file),
                    LastChanged = File.GetLastWriteTime(file),
                };

                coreFiles.Add(corefile);
            }

            string[] modelFiles = null;

            if (Directory.Exists(path + "/Model"))
            {
                modelFiles = Directory.GetFiles(path + "/Model");
                foreach (string file in modelFiles)
                {
                    AltinnCoreFile corefile = new AltinnCoreFile
                    {
                        FilePath = file,
                        FileName = Path.GetFileName(file),
                        LastChanged = File.GetLastWriteTime(file),
                    };

                    coreFiles.Add(corefile);
                }
            }

            return coreFiles;
        }

    }
}
