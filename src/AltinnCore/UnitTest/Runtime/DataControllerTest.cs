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
        /// Test creation of a form data element.
        /// </summary>
        [Fact]
        public void Post_TC01_FormData()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = true
                    }
                }
            };

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
                        StorageUrl = "www.storageuri.com"
                    }
                }
            };

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
                .Setup(d => d.InsertFormData(It.IsAny<object>(), instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId))
                .Returns(Task.FromResult(updatedInstance));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult result = dataController.Create(org, app, instanceOwnerId, instanceGuid, elementType).Result;

            Assert.IsType<CreatedResult>(result);

            List<DataElement> createdElements = (List<DataElement>)((CreatedResult)result).Value;

            Assert.NotNull(createdElements);
            Assert.True(createdElements.Any());
        }

        /// <summary>
        /// Create binary data
        /// </summary>
        [Fact]
        public void Post_TC02_BinaryData()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = false
                    }
                }
            };

            Instance getInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,
            };

            DataElement data = new DataElement()
            {
                Id = $"{dataGuid}",
                ElementType = "default",
                StorageUrl = "www.storageuri.com"
            };

            /* SETUP MOCK SERVICES */
            Stream dataStream = File.OpenRead("Runtime/data/data-element.xml");

            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataStream);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                    .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                    .Returns(Task.FromResult(getInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.InsertBinaryData(org, app, instanceOwnerId, instanceGuid, It.IsAny<string>(), It.IsAny<string>(), It.IsAny<HttpRequest>()))
                    .Returns(Task.FromResult(data));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult result = dataController.Create(org, app, instanceOwnerId, instanceGuid, elementType).Result;

            Assert.IsType<CreatedResult>(result);

            List<DataElement> createdElements = (List<DataElement>)((CreatedResult)result).Value;

            Assert.NotNull(createdElements);
            Assert.True(createdElements.Any());
        }

        /// <summary>
        /// Test paths that should result in error.
        /// </summary>
        [Fact]
        public void Post_TC03_ErrorResults()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = true
                    }
                }
            };

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
                        StorageUrl = "www.storageuri.com"
                    }
                }
            };

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.Is<string>(a => a.Equals(app))))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(getInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.InsertFormData(It.IsAny<object>(), instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId))
                .Returns(Task.FromResult(updatedInstance));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult noElementTypeResult = dataController.Create(org, app, instanceOwnerId, instanceGuid, string.Empty).Result;
            ActionResult appNotFoundResult = dataController.Create(org, "fake-app-name", instanceOwnerId, instanceGuid, elementType).Result;
            ActionResult invalidElementTypeResult = dataController.Create(org, app, instanceOwnerId, instanceGuid, "invalidElementType").Result;                
            ActionResult instanceNotFoundResult = dataController.Create(org, app, instanceOwnerId, Guid.NewGuid(), elementType).Result;

            Assert.IsType<BadRequestObjectResult>(noElementTypeResult);
            Assert.IsType<NotFoundObjectResult>(appNotFoundResult);
            Assert.IsType<BadRequestObjectResult>(invalidElementTypeResult);         
            Assert.IsType<NotFoundObjectResult>(instanceNotFoundResult);
        }

        /// <summary>
        /// Gets a form data element from data id.
        /// </summary>
        [Fact]
        public void Get_TC01_FormData()
        {
            /* SETUP TEST DATA */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = true
                    }
                }
            };

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

            XmlSerializer serializer = new XmlSerializer(typeof(Skjema));
            object skjema = serializer.Deserialize(File.OpenRead("Runtime/data/data-element.xml"));

            /* SETUP MOCK SERVICES */
            Mock<HttpRequest> request = MockRequest();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetFormData(instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId, dataGuid))
                .Returns(skjema);

            /* TEST */

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            ActionResult result = dataController.Get(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<OkObjectResult>(result);

            OkObjectResult okresult = result as OkObjectResult;
            Skjema model = (Skjema)okresult.Value;

            Assert.Equal(5800, model.gruppeid);
            Assert.Equal("Ærlige Øksne Åsheim", model.Skattyterinforgrp5801.Kontaktgrp5803.KontaktpersonNavndatadef2.value);
        }

        /// <summary>
        /// Gets binary data element from data id.
        /// </summary>
        [Fact]
        public void Get_TC02_BinaryData()
        {
            /* SETUP TEST DATA */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "xml-attachment",
                        AppLogic = false
                    }
                }
            };

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
                        ElementType = "xml-attachment",
                        ContentType = "application/xml",
                    }
                }
            };

            Stream dataStream = File.OpenRead("Runtime/data/data-element.xml");

            /* SETUP MOCK SERVICES */
            Mock<HttpRequest> request = MockRequest();

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.GetBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid))
                .Returns(Task.FromResult(dataStream));

            /* TEST */
            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

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
        /// Trying to get data element for instance that doesn't exist.
        /// </summary>
        [Fact]
        public void Get_TC03_ErrorResults()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default"
                    }
                }
            };

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
                        StorageUrl = "www.storageuri.com"
                    }
                }
            };

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.Is<string>(a => a.Equals(app))))
                .Throws(new Exception());

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid))
                .Returns(Task.FromResult(true));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult instanceNotFoundResult = dataController.Get(org, app, instanceOwnerId, Guid.NewGuid(), dataGuid).Result;
            ActionResult dataNotFoundResult = dataController.Get(org, app, instanceOwnerId, instanceGuid, Guid.NewGuid()).Result;
            ActionResult appLogicMissingResult = dataController.Get(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<NotFoundObjectResult>(instanceNotFoundResult);
            Assert.IsType<NotFoundObjectResult>(dataNotFoundResult);
            Assert.IsType<BadRequestObjectResult>(appLogicMissingResult);
        }

        /// <summary>
        /// Updates a binary data element 
        /// </summary>
        [Fact]
        public void Put_TC01_BinaryData()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = false
                    }
                }
            };

            DataElement data = new DataElement()
            {
                Id = $"{dataGuid}",
                ElementType = "default",
                StorageUrl = "www.storageuri.com"
            };
            Instance beforeInstance = new Instance()
            {
                Id = $"{instanceOwnerId}/{instanceGuid}",
                InstanceOwnerId = $"{instanceOwnerId}",
                AppId = $"{org}/{app}",
                Org = org,

                Data = new List<DataElement>()
                {
                    data
                }
            };

            Instance afterInstance = beforeInstance;

            /* SETUP MOCK SERVICES */
            Stream dataStream = File.OpenRead("Runtime/data/data-element.xml");

            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataStream);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                    .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                    .Returns(Task.FromResult(beforeInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.UpdateBinaryData(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<HttpRequest>()))
                    .Returns(Task.FromResult(data));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult result = dataController.Put(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<CreatedResult>(result);

            List<DataElement> createdElements = (List<DataElement>)((CreatedResult)result).Value;

            Assert.NotNull(createdElements);
            Assert.True(createdElements.Any());
        }

        /// <summary>
        /// Updates a form data element
        /// </summary>
        [Fact]
        public void Put_TC02_FormData()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = true
                    }
                }
            };

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

            Instance afterInstance = beforeInstance;

            Mock<HttpRequest> request = MockRequest();
            XmlSerializer serializer = new XmlSerializer(typeof(Skjema));
            object skjema = serializer.Deserialize(File.OpenRead("Runtime/data/data-element.xml"));

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");

            request.SetupGet(x => x.Body).Returns(dataElement);
            request.SetupGet(x => x.ContentType).Returns("application/xml");

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(beforeInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
             .Setup(d => d.UpdateData(It.IsAny<object>(), instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId, dataGuid))
             .Returns(Task.FromResult(afterInstance));

            /* TEST */
            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            ActionResult result = dataController.Put(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<CreatedResult>(result);
        }
        
        /// <summary>
        /// Test paths that should result in error.
        /// </summary>
        [Fact]
        public void Put_TC03_ErrorResults()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default",
                        AppLogic = true
                    }
                }
            };

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
                        StorageUrl = "www.storageuri.com"
                    }
                }
            };

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.Is<string>(a => a.Equals(app))))
                .Throws(new Exception());

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.InsertFormData(It.IsAny<object>(), instanceGuid, It.IsAny<Type>(), org, app, instanceOwnerId))
                .Returns(Task.FromResult(instance));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult instanceNotFoundResult = dataController.Get(org, app, instanceOwnerId, Guid.NewGuid(), dataGuid).Result;
            ActionResult dataNotFoundResult = dataController.Get(org, app, instanceOwnerId, instanceGuid, Guid.NewGuid()).Result;
            ActionResult appLogicMissingResult = dataController.Get(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<NotFoundObjectResult>(instanceNotFoundResult);
            Assert.IsType<NotFoundObjectResult>(dataNotFoundResult);
            Assert.IsType<BadRequestObjectResult>(appLogicMissingResult);

        }

        /// <summary>
        /// Test delete binary data.
        /// </summary>
        [Fact]
        public void Delete_TC01_BinaryData()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "binary",
                        AppLogic = false
                    }
                }
            };

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
                        ElementType = "binary",
                    }
                }
            };

            Instance afterInstance = beforeInstance;

            Mock<HttpRequest> request = MockRequest();
            XmlSerializer serializer = new XmlSerializer(typeof(Skjema));
            object skjema = serializer.Deserialize(File.OpenRead("Runtime/data/data-element.xml"));

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");

            request.SetupGet(x => x.Body).Returns(dataElement);
            request.SetupGet(x => x.ContentType).Returns("application/xml");

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.FromResult(application));

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .Returns(Task.FromResult(beforeInstance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
             .Setup(d => d.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid))
             .Returns(Task.FromResult(true));

            /* TEST */
            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            ActionResult result = dataController.Delete(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<OkResult>(result);
        }

        /// <summary>
        /// Test paths that should result in error.
        /// </summary>
        [Fact]
        public void Delete_TC02_ErrorResults()
        {
            /* SETUP */
            Application application = new Application()
            {
                Id = $"{org}/{app}",
                ElementTypes = new List<ElementType>()
                {
                    new ElementType()
                    {
                        Id = "default"
                    }
                }
            };

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
                        StorageUrl = "www.storageuri.com"
                    }
                }
            };

            FileStream dataElement = File.OpenRead("Runtime/data/data-element.xml");
            Mock<HttpRequest> request = MockRequest();
            request.SetupGet(x => x.Body).Returns(dataElement);

            var context = new Mock<HttpContext>();
            context.SetupGet(x => x.Request).Returns(request.Object);
            context.SetupGet(x => x.User).Returns(MockUser().Object);

            Mock<IApplication> appServiceMock = new Mock<IApplication>();
            appServiceMock
                .Setup(i => i.GetApplication(It.IsAny<string>(), It.Is<string>(a => a.Equals(app))))
                .Throws(new Exception());

            Mock<IInstance> instanceServiceMock = new Mock<IInstance>();
            instanceServiceMock
                .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.Is<Guid>(g => g.Equals(instanceGuid))))
                .Returns(Task.FromResult(instance));

            Mock<IData> dataServiceMock = new Mock<IData>();
            dataServiceMock
                .Setup(d => d.DeleteBinaryData(org, app, instanceOwnerId, instanceGuid, dataGuid))
                .Returns(Task.FromResult(true));

            DataController dataController = NewDataController(context, instanceServiceMock, dataServiceMock, appServiceMock);

            /* TEST */
            ActionResult instanceNotFoundResult = dataController.Delete(org, app, instanceOwnerId, Guid.NewGuid(), dataGuid).Result;
            ActionResult dataNotFoundResult = dataController.Delete(org, app, instanceOwnerId, instanceGuid, Guid.NewGuid()).Result;
            ActionResult appLogicMissingResult = dataController.Delete(org, app, instanceOwnerId, instanceGuid, dataGuid).Result;

            Assert.IsType<NotFoundObjectResult>(instanceNotFoundResult);
            Assert.IsType<NotFoundObjectResult>(dataNotFoundResult);
            Assert.IsType<BadRequestObjectResult>(appLogicMissingResult);
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

        private DataController NewDataController(Mock<HttpContext> context, Mock<IInstance> instanceServiceMock, Mock<IData> dataServiceMock, Mock<IApplication> appServiceMock)
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
                appServiceMock.Object)
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

            if (Directory.Exists(path + "/Model"))
            {
                string[] modelFiles = Directory.GetFiles(path + "/Model");
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
