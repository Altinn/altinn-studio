using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using Altinn.Common.EFormidlingClient.Configuration;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Logging.Debug;
using Xunit;

namespace Altinn.Common.EFormidlingClient.Tests.ClientTest
{
    /// <summary>
    /// Represents a collection of int test, testing the<see cref="EFormidlingClientIntTest"/> class.
    /// </summary>
    public class EFormidlingClientIntTest : IClassFixture<EFormidlingClientIntTest.Fixture>
    {
        private readonly ServiceProvider _serviceProvider;
        private string _guid;

        /// <summary>
        /// Initializes a new instance of the <see cref="EFormidlingClientIntTest"/> class.
        /// </summary>
        /// <param name="fixture">Fixture for setup</param>
        public EFormidlingClientIntTest(Fixture fixture)
        {
            _serviceProvider = fixture.ServiceProvider;
            _guid = fixture.CustomGuid;        
        }

        /// <summary>
        /// Tests retrieving capabilities
        /// Expected: Response is valid Type of Capabilities dto
        /// </summary>
        [Fact]
        public async void Get_Capabilities() 
        {        
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await service.GetCapabilities("984661185", null);

            Assert.Equal(typeof(Capabilities), result.GetType());
            Assert.IsType<Capabilities>(result);
        }

        /// <summary>
        /// Tests retrieving capabilities with invalid parameter input
        /// Expected: ArgumentNullException when passing empty input parameter
        /// </summary>
        [Fact]
        public async void Get_Capabilities_Invalid_ParameterInput()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var result = await service.GetCapabilities("984661185", null);

            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.GetCapabilities(string.Empty, null));
        }

        /// <summary>
        /// Tests sending Standard Business Document. If successful the sbd is returned in response
        /// Expected: Returned sbd is a valid instance of StandardBusinessDocument dto and equal to the sbd sent.
        /// </summary>
        [Fact]
        public async void Send_Standard_Business_Document()
        {       
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var jsonString = File.ReadAllText(@"TestData\sbd.json"); 
            StandardBusinessDocument sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

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
            
            StandardBusinessDocument sbdVerified = await service.CreateMessage(sbd, null);     
            Assert.Equal(JsonSerializer.Serialize(sbdVerified), JsonSerializer.Serialize(sbd));
        }

        /// <summary>
        /// Tests retrieving the conversation by id
        /// Expected: Valid instance of Conversation dto and not null
        /// </summary>
        [Fact]
        public async void Get_Conversation_By_Id()
        {
            var myService = _serviceProvider.GetService<IEFormidlingClient>();
            Conversation conversation = await myService.GetConversationByMessageId(_guid, null);

            Assert.NotNull(conversation);
        }

        /// <summary>
        /// Tests sending arkivmelding
        /// Expected: Return value of send attachment is true
        /// </summary>
        [Fact]
        public async void Send_Attachment_Arkivmelding()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            StandardBusinessDocument sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            currentCreationTime = currentCreationTime.AddMinutes(-1);
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);

            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;
            _ = await service.CreateMessage(sbd, null);

            string filename = "arkivmelding.xml";
            bool sendArkivmelding = false;

            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                if (fs.Length > 3)
                {
                    sendArkivmelding = await service.UploadAttachment(fs, _guid, filename, null);
                }
            }

            Assert.True(sendArkivmelding);
        }

        /// <summary>
        /// Tests sending Invalid Standard Business Document
        /// Expected: WebException when sending invalid Standard Business Document. In this case expectedResponseDateTime
        /// is invalid as it is not a future datetime
        /// </summary>
        [Fact]
        public async void Send_Invalid_Standard_Business_Document()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            StandardBusinessDocument sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);
          
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;

            WebException ex = await Assert.ThrowsAsync<WebException>(async () => await service.CreateMessage(sbd, null));
        }

        /// <summary>
        /// Tests sending Binary Attachment
        /// Expected: True after sending binary attachment
        /// </summary>
        [Fact]
        public async void Send_Attachment_Binary()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            StandardBusinessDocument sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            currentCreationTime = currentCreationTime.AddMinutes(-1);
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);
            
            Guid obj = Guid.NewGuid();
            _guid = obj.ToString();

            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;
            _ = await service.CreateMessage(sbd, null);

            string filename = "test.pdf";
            bool sendBinaryFile = false;

            using (FileStream fs = File.OpenRead(@"TestData\test.pdf"))
            {
                if (fs.Length > 3)
                {
                    sendBinaryFile = await service.UploadAttachment(fs, _guid, filename, null);
                }
            }

            Assert.True(sendBinaryFile);
        }

        /// <summary>
        /// Tests sending message
        /// Expected: True after completing send message
        /// </summary>
        [Fact]
        public async void Send_Message()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var completeSending = await service.SendMessage(_guid, null);

            Assert.True(completeSending);
        }

        /// <summary>
        /// Tests that the message sent contains the correct data in its content. An ASIC-E container is wrapping the data
        /// content. The container is built after sending the data to the IP. In order to verify that the container content is correct,
        /// send a message to the same receiver id as sender, i.e. to self. This will make the container availble in the incomming queue.
        /// First perform a peek of the queue, verify that the SBD and InstanceIdentifier is the correct ID. Next, pop the message to retrieve
        /// the ASIC-E. Download the content and write to file, and then delete the message from the queue. Open the file 'sent_package.zip'
        /// and examine the content.
        /// Expected: True as zip file is created 
        /// </summary>
        [Fact]
        public async void Verify_Sent_Attachments()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            StandardBusinessDocument sbd = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            string process = "urn:no:difi:profile:arkivmelding:administrasjon:ver1.0";
            string type = "arkivmelding";

            DateTime currentCreationTime = DateTime.Now;
            currentCreationTime = currentCreationTime.AddMinutes(-1);
            DateTime currentCreationTime2HoursLater = currentCreationTime.AddHours(2);

            Guid obj = Guid.NewGuid();
            _guid = obj.ToString();
           
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().Identifier = process;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.BusinessScope.Scope.First().ScopeInformation.First().ExpectedResponseDateTime = currentCreationTime2HoursLater;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.Type = type;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.InstanceIdentifier = _guid;
            sbd.StandardBusinessDocumentHeader.DocumentIdentification.CreationDateAndTime = currentCreationTime;

            await service.CreateMessage(sbd, null);

            string filename = "arkivmelding.xml";
            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                if (fs.Length > 3)
                {
                    _ = await service.UploadAttachment(fs, _guid, filename, null);
                }
            }

            string filenameAttachment = "test.pdf";
            using (FileStream fs = File.OpenRead(@"TestData\test.pdf"))
            {
                if (fs.Length > 3)
                {
                    _ = await service.UploadAttachment(fs, _guid, filenameAttachment, null);
                }
            }

            await service.SendMessage(_guid, null);
            Thread.Sleep(20000);

            var httpClient = new HttpClient();
            var messageId = _guid;
            var appsetting = _serviceProvider.GetService<IConfiguration>().GetSection("EFormidlingClientSettings:BaseUrl");
            var baseUrl = appsetting.Value;

            HttpResponseMessage response = await httpClient.GetAsync($"{baseUrl}messages/in/peek?serviceIdentifier=DPO");
            string responseBody = await response.Content.ReadAsStringAsync();

            JsonSerializer.Deserialize<StandardBusinessDocument>(responseBody);
            response = await httpClient.GetAsync($"{baseUrl}messages/in/pop/{messageId}");

            FileInfo fileInfo;
                            
            using (var stream = response.Content.ReadAsStreamAsync().Result)
            {
                fileInfo = new FileInfo("sent_package.zip");
                using var fileStream = fileInfo.OpenWrite();
                await stream.CopyToAsync(fileStream);
            }
                           
            response = await httpClient.DeleteAsync($"{baseUrl}messages/in/{messageId}");
            _ = await response.Content.ReadAsStringAsync();

            Assert.True(fileInfo.Exists);              
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="Fixture"/> class.
        /// </summary>
        public class Fixture
        {
            /// <summary>
            ///  Gets the ServiceProvider
            /// </summary>
            public ServiceProvider ServiceProvider { get; private set; }

            /// <summary>
            ///  Gets the CustomGuid
            /// </summary>
            public string CustomGuid { get; private set; }

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

                serviceCollection.AddScoped<IConfiguration>(_ => configuration);
                serviceCollection.AddTransient<HttpClient>();
                serviceCollection.AddTransient<IEFormidlingClient, EFormidlingClient>();
                ServiceProvider = serviceCollection.BuildServiceProvider();
      
                Guid obj = Guid.NewGuid();
                CustomGuid = obj.ToString();
            }
        }
    }
}
