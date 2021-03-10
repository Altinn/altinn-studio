using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using Altinn.Common.EFormidlingClient.Configuration;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Logging.Debug;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace Altinn.Common.EFormidlingClient.Tests.ClientTest
{
    /// <summary>
    /// Represents a collection of int test, testing the<see cref="EFormidlingClientTest"/> class.
    /// </summary>
    public class EFormidlingClientTest : IClassFixture<EFormidlingClientTest.Fixture>
    {
        private ServiceProvider _serviceProvider;
        private string _guid;

        /// <summary>
        /// Initializes a new instance of the <see cref="EFormidlingClientTest"/> class.
        /// </summary>
        /// <param name="fixture">Fixture for setup</param>
        public EFormidlingClientTest(Fixture fixture)
        {
            _serviceProvider = fixture.ServiceProvider;
            _guid = fixture.CustomGuid;        
        }

        /// <summary>
        /// Tests retrieving capabilities
        /// </summary>
        [Fact]
        public async void Get_Capabilities() 
        {        
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await service.GetCapabilities("984661185");

            Assert.Equal(typeof(Capabilities), result.GetType());
            Assert.IsType<Capabilities>(result);
        }

        /// <summary>
        /// Tests retrieving capabilities with invalid parameter input
        /// </summary>
        [Fact]
        public async void Get_Capabilities_Invalid_ParameterInput()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await service.GetCapabilities("984661185");

            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.GetCapabilities(string.Empty));
        }

        /// <summary>
        /// Tests sending Standard Business Document
        /// </summary>
        [Fact]
        public async void Send_Standard_Business_Document()
        {       
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            JObject o1 = JObject.Parse(File.ReadAllText(@"TestData\sbd.json")); 
            StandardBusinessDocument sbd = JsonConvert.DeserializeObject<StandardBusinessDocument>(o1.ToString());

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);

            Guid obj = Guid.NewGuid();
            _guid = obj.ToString();

            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;        
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;
            
            StandardBusinessDocument sbdVerified = await service.CreateMessage(sbd);     
            Assert.Equal(JsonConvert.SerializeObject(sbdVerified), JsonConvert.SerializeObject(sbd));
        }

        /// <summary>
        /// Tests retrieving the conversation by id
        /// </summary>
        [Fact]
        public async void Get_Conversation_By_Id()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            Conversation conversation = await myService.GetConversationByMessageId(_guid);

            Assert.NotNull(conversation);
        }

        /// <summary>
        /// Tests sending arkivmelding
        /// </summary>
        [Fact]
        public async void Send_Attachment_Arkivmelding()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            JObject o1 = JObject.Parse(File.ReadAllText(@"TestData\sbd.json"));
            StandardBusinessDocument sbd = JsonConvert.DeserializeObject<StandardBusinessDocument>(o1.ToString());

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);

            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;

            StandardBusinessDocument sbdVerified = await service.CreateMessage(sbd);
       
            string filename = "arkivmelding.xml";
            bool sendArkivmelding = false;

            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                if (fs.Length > 3)
                {
                    sendArkivmelding = await service.UploadAttachment(fs, _guid, filename);
                }
            }

            Assert.True(sendArkivmelding);
        }

        /// <summary>
        /// Tests sending Invalid Standard Business Document
        /// </summary>
        [Fact]
        public async void Send_Invalid_Standard_Business_Document()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            JObject o1 = JObject.Parse(File.ReadAllText(@"TestData\sbdInvalid.json"));
            StandardBusinessDocument sbd = JsonConvert.DeserializeObject<StandardBusinessDocument>(o1.ToString());
          
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);
          
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;

            WebException ex = await Assert.ThrowsAsync<WebException>(async () => await service.CreateMessage(sbd));
        }

        /// <summary>
        /// Tests sending Binary Attachment
        /// </summary>
        [Fact]
        public async void Send_Attachment_Binary()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            JObject o1 = JObject.Parse(File.ReadAllText(@"TestData\sbd.json"));
            StandardBusinessDocument sbd = JsonConvert.DeserializeObject<StandardBusinessDocument>(o1.ToString());

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);

            Guid obj = Guid.NewGuid();
            _guid = obj.ToString();

            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;

            StandardBusinessDocument sbdVerified = await service.CreateMessage(sbd);

            string filename = "test.pdf";
            bool sendBinaryFile = false;

            using (FileStream fs = File.OpenRead(@"TestData\test.pdf"))
            {
                if (fs.Length > 3)
                {
                    sendBinaryFile = await service.UploadAttachment(fs, _guid, filename);
                }
            }

            Assert.True(sendBinaryFile);
        }

        /// <summary>
        /// Tests sending message
        /// </summary>
        [Fact]
        public async void Send_Message()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var completeSending = await service.SendMessage(_guid);

            Assert.True(completeSending);
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="Fixture"/> class.
        /// </summary>
        public class Fixture
        {
            /// <summary>
            /// Initializes a new instance of the <see cref="Fixture"/> class.
            /// </summary>
            public Fixture()
            {
                var serviceCollection = new ServiceCollection();
                var configuration = new ConfigurationBuilder()
                    .SetBasePath(Directory.GetCurrentDirectory())
                    .AddJsonFile("appsettings.json", optional: false)
                    .AddEnvironmentVariables()
                    .Build();

                serviceCollection.Configure<EFormidlingClientSettings>(configuration.GetSection("EFormidlingClientSettings"));
                serviceCollection.AddLogging(config =>
                {
                    config.AddDebug();
                    config.AddConsole();
                })
                     .Configure<LoggerFilterOptions>(options =>
                     {
                         options.AddFilter<DebugLoggerProvider>(null, LogLevel.Debug);
                         options.AddFilter<ConsoleLoggerProvider>(null, LogLevel.Debug);
                     });

                serviceCollection.AddTransient<HttpClient>();
                serviceCollection.AddTransient<IEFormidlingClient, EFormidlingClient>();
                ServiceProvider = serviceCollection.BuildServiceProvider();

                Guid obj = Guid.NewGuid();
                CustomGuid = obj.ToString();
            }

            /// <summary>
            ///  Gets the ServiceProvider
            /// </summary>
            public ServiceProvider ServiceProvider { get; private set; }

            /// <summary>
            ///  Gets the CustomGuid
            /// </summary>
            public string CustomGuid { get; private set; }
        }

    }
}
