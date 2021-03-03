using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using Altinn.EFormidlingClient;
using Altinn.EFormidlingClient.Configuration;
using Altinn.EFormidlingClient.Models;
using Altinn.EFormidlingClient.Models.SBD;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Logging.Debug;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Xunit;

namespace IntTestFormidling
{ 
    public class Fixture
    {   
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
                     options.AddFilter<DebugLoggerProvider>(null /* category*/ , LogLevel.Debug /* min level */);
                     options.AddFilter<ConsoleLoggerProvider>(null  /* category*/ , LogLevel.Debug /* min level */);
                 });

            serviceCollection.AddTransient<HttpClient>();
            serviceCollection.AddTransient<IEFormidlingClient, EFormidlingClient>();
            ServiceProvider = serviceCollection.BuildServiceProvider();

            Guid obj = Guid.NewGuid();
            CustomGuid = obj.ToString();
        }

        public ServiceProvider ServiceProvider { get; private set; }
        public string CustomGuid { get; private set; }
    }

    public class EformidlingClientTest : IClassFixture<Fixture>
    {
        private ServiceProvider _serviceProvider;
        private string _guid;
        public EformidlingClientTest(Fixture fixture)
        {
            _serviceProvider = fixture.ServiceProvider;
            _guid = fixture.CustomGuid;        
        }

        [Fact]
        public async void Get_Capabilities() 
        {        
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await myService.GetCapabilities("984661185");

            Assert.Equal(typeof(Capabilities), result.GetType());
            Assert.IsType<Capabilities>(result);
        }

        [Fact]
        public async void Get_Capabilities_Invalid_ParameterInput()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await service.GetCapabilities("984661185");

            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.GetCapabilities(""));
        }
       
        [Fact]
        public async void Send_Standard_Business_Document()
        {       
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
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
            
            StandardBusinessDocument sbdVerified = await myService.CreateMessage(sbd);     
            Assert.Equal(JsonConvert.SerializeObject(sbdVerified), JsonConvert.SerializeObject(sbd));
        }

        [Fact]
        public async void Get_Conversation_By_Id()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            Conversation conversation = await myService.GetConversationByMessageId(_guid);

            Assert.NotNull(conversation);
        }

        [Fact]
        public async void Send_Attachment_Arkivmelding()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
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

            StandardBusinessDocument sbdVerified = await myService.CreateMessage(sbd);
       
            string filename = "arkivmelding.xml";
            bool sendArkivmelding = false;

            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                if (fs.Length > 3)
                {
                    sendArkivmelding = await myService.UploadAttachment(fs, _guid, filename);
                }
            }

            Assert.True(sendArkivmelding);
        }

        [Fact]
        public async void Send_Invalid_Standard_Business_Document()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
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

            WebException ex = await Assert.ThrowsAsync<WebException>(async () => await myService.CreateMessage(sbd));
        }

        [Fact]
        public async void Send_Attachment_Binary()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            string filename = "test.pdf";
            bool sendBinaryFile = false;

            using (FileStream fs = File.OpenRead(@"TestData\test.pdf"))
            {
                if (fs.Length > 3)
                {
                    sendBinaryFile = await myService.UploadAttachment(fs, _guid, filename);
                }
            }

            Assert.True(sendBinaryFile);
        }

        [Fact]
        public async void Send_Message()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            var completeSending = await myService.SendMessage(_guid);

            Assert.True(completeSending);
        }

    }
}
