using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;

using Altinn.App;
using Altinn.App.IntegrationTests.Mocks.Authentication;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Models.Validation;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Authentication.Maskinporten;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.JwtCookie;

using App.IntegrationTests.Mocks.Services;
using App.IntegrationTests.Utils;
using App.IntegrationTestsRef.Mocks.Services;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace App.IntegrationTestsRef.EndToEndTests
{
    public class EndToEndTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private readonly WebApplicationFactory<Startup> _factory;

        private string org;
        private string app;

        private int instanceOwnerId;

        private string instanceGuid;

        private Instance instance;
        private readonly Dictionary<string, DataElement> dataElements = new Dictionary<string, DataElement>();
        private readonly Dictionary<string, object> dataBlobs = new Dictionary<string, object>();

        public EndToEndTests(WebApplicationFactory<Startup> factory)
        {
            _factory = factory;
        }

        [Fact]
        public async void ComplexProcessApp()
        {
            // Arrange
            org = "tdd";
            app = "complex-process";
            instanceOwnerId = 1000;

            string token = PrincipalUtil.GetToken(1);
            HttpClient client = GetTestClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            #region Start Process

            // Arrange
            Instance template = new Instance
            {
                InstanceOwner = new InstanceOwner { PartyId = instanceOwnerId.ToString() }
            };
            string expectedCurrentTaskName = "Task_1";

            // Act
            string url = $"/{org}/{app}/instances/";

            HttpResponseMessage response = await client.PostAsync(
                url,
                new StringContent(template.ToString(), Encoding.UTF8, "application/json"));

            // Assert
            response.EnsureSuccessStatusCode();

            Instance createdInstance =
                JsonConvert.DeserializeObject<Instance>(await response.Content.ReadAsStringAsync());
            instanceGuid = createdInstance.Id.Split('/')[1];
            string dataGuid = createdInstance.Data.Where(d => d.DataType.Equals("default")).Select(d => d.Id).First();

            Assert.Equal(expectedCurrentTaskName, createdInstance.Process.CurrentTask.ElementId);

            #endregion

            #region Upload invalid attachment type

            // Act
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/data?dataType=invalidDataType";
            response = await client.PostAsync(url, null);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            #endregion

            #region Move process to next step

            // Arrange
            string expectedNextTask = "Task_2";
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/process/next";

            // Act
            response = await client.GetAsync(url);

            List<string> nextTasks =
                JsonConvert.DeserializeObject<List<string>>(await response.Content.ReadAsStringAsync());
            string actualNextTask = nextTasks[0];

            // Assert
            Assert.Equal(expectedNextTask, actualNextTask);

            // Act
            response = await client.PutAsync(url, null);

            // Assert
            response.EnsureSuccessStatusCode();

            #endregion

            #region Upload form data during Task_2

            // Arrange
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/data/{dataGuid}";

            // Act
            response = await client.PutAsync(url, null);

            // Assert: Upload for data during step 2
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            #endregion

            #region Validate Task_2 before valid time

            // Arrange
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/validate";

            // Act
            response = await client.GetAsync(url);
            string responseContent = await response.Content.ReadAsStringAsync();
            List<ValidationIssue> messages =
                (List<ValidationIssue>)JsonConvert.DeserializeObject(responseContent, typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Single(messages);
            Assert.Equal(ValidationIssueSeverity.Error, messages[0].Severity);

            #endregion

            #region Validate Task_2 after valid time

            // Arrange
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/validate";

            // Act
            Thread.Sleep(new TimeSpan(0, 0, 12));
            response = await client.GetAsync(url);
            responseContent = await response.Content.ReadAsStringAsync();
            messages = (List<ValidationIssue>)JsonConvert.DeserializeObject(
                responseContent,
                typeof(List<ValidationIssue>));

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Empty(messages);

            #endregion

            #region Complete process

            // Arrange
            url = $"/{org}/{app}/instances/{instanceOwnerId}/{instanceGuid}/process/completeProcess";

            // Act
            response = await client.PutAsync(url, null);
            ProcessState endProcess =
                JsonConvert.DeserializeObject<ProcessState>(await response.Content.ReadAsStringAsync());

            // Assert
            response.EnsureSuccessStatusCode();
            Assert.NotNull(endProcess);

            #endregion
        }

        private HttpClient GetTestClient()
        {
            Mock<IInstance> instanceService = new Mock<IInstance>();
            instanceService.Setup(s =>
                    s.CreateInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Instance>()))
                .ReturnsAsync((string appOwner, string appName, Instance instanceTemplate) =>
                {
                    instance = new Instance
                    {
                        Id = $"{instanceTemplate.InstanceOwner.PartyId}/{Guid.NewGuid()}",
                        AppId = $"{appOwner}/{appName}",
                        Org = appOwner,
                        InstanceOwner = instanceTemplate.InstanceOwner,
                        Process = instanceTemplate.Process,
                        Data = new List<DataElement>(),
                    };
                    return instance;
                });
            instanceService.Setup(s =>
                    s.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
                .ReturnsAsync(() =>
                {
                    return instance;
                });
            instanceService.Setup(s =>
                    s.GetInstance(It.IsAny<Instance>()))
                .ReturnsAsync(() =>
                {
                    return instance;
                });
            instanceService.Setup(s => s.UpdateProcess(It.IsAny<Instance>())).ReturnsAsync(
                (Instance originalInstance) =>
                {
                    ProcessState process = originalInstance.Process;
                    if (instance?.Process?.Ended == null && process.Ended != null)
                    {
                        instance.Status ??= new InstanceStatus();
                        instance.Status.Archived = process.Ended;
                    }

                    instance.Process = process;
                    instance.LastChanged = DateTime.UtcNow;

                    return instance;
                });

            Mock<IData> dataService = new Mock<IData>();
            dataService.Setup(s => s.InsertFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<It.IsAnyType>(),
                    It.IsAny<Type>()))
                .ReturnsAsync((Instance parentInstance, string dataType, dynamic originalElement, Type type) =>
                {
                    Guid dataGuid = Guid.NewGuid();
                    dataElements.Add(dataGuid.ToString(), new DataElement
                    {
                        Id = dataGuid.ToString(),
                        DataType = dataType,
                        ContentType = "application/xml",
                        InstanceGuid = parentInstance.Id.Split('/')[1]
                    });
                    dataBlobs.Add(dataGuid.ToString(), originalElement);

                    return dataElements[dataGuid.ToString()];
                });
            dataService.Setup(s => s.GetFormData(
                    It.IsAny<Guid>(),
                    It.IsAny<Type>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>()))
                .ReturnsAsync((Guid dataGuid, Type dataType, string appOwner, string appName, int partyId, Guid dataId) =>
                    {
                        return dataBlobs[dataId.ToString()];
                    });

            WebApplicationFactory<Startup> factory = _factory.WithWebHostBuilder(builder =>
            {
                string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
                string path = Path.Combine(unitTestFolder, $"../../../Data/Apps/{org}/{app}/");

                builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(path + "appsettings.json"); });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile(path + "appsettings.json")
                    .Build();

                configuration.GetSection("AppSettings:AppBasePath").Value = path;

                IConfigurationSection appSettingSection = configuration.GetSection("AppSettings");

                builder.ConfigureTestServices(services =>
                {
                    services.Configure<AppSettings>(appSettingSection);

                    services.AddSingleton<IPDP, PepWithPDPAuthorizationMockSI>();

                    services.AddSingleton<IValidation, ValidationAppSI>();

                    services.AddTransient<IApplication, ApplicationMockSI>();
                    services.AddTransient(provider => instanceService.Object);
                    services.AddTransient(provider => dataService.Object);
                    services.AddTransient<IInstanceEvent, InstanceEventAppSIMock>();
                    services.AddTransient<IDSF, DSFMockSI>();
                    services.AddTransient<IER, ERMockSI>();
                    services.AddTransient<IRegister, RegisterMockSI>();
                    services.AddTransient<IPDF, PDFMockSI>();
                    services.AddTransient<IProfile, ProfileMockSI>();
                    services.AddTransient<IText, TextMockSI>();

                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();

                    switch (app)
                    {
                        case "complex-process":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.complex_process.App>();
                            break;
                    }
                });
            });
            factory.Server.AllowSynchronousIO = true;
            return factory.CreateClient();
        }
    }
}
