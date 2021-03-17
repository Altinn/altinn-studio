using System;
using System.Collections.Generic;
using System.Configuration;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Xml.Serialization;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Configuration;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Logging.Debug;
using Xunit;
using Arkivmelding = Altinn.Common.EFormidlingClient.Models.Arkivmelding;

namespace Altinn.EFormidlingClient.Tests.ClientUnitTest
{
    /// <summary>
    /// Represents a collection of unit test, testing the<see cref="EFormidlingClientUnitTest"/> class.
    /// </summary>
    public class EFormidlingClientUnitTest : IClassFixture<FixtureUnit>
    {
        private readonly ServiceProvider _serviceProvider;

        /// <summary>
        /// Initializes a new instance of the <see cref="EFormidlingClientUnitTest"/> class.
        /// </summary>
        /// <param name="fixture">Fixture for setup</param>
        public EFormidlingClientUnitTest(FixtureUnit fixture)
        {
            _serviceProvider = fixture.ServiceProvider;
        }

        /// <summary>
        /// Test valid sbd json from file
        /// </summary>
        [Fact]
        public void Is_Valid_Json()
        {
            var jsonString = File.ReadAllText(@"TestData\sbd.json");
            var json = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            Assert.NotNull(json);
        }

        /// <summary>
        /// Test invalid sbd json from file
        /// </summary>
        [Fact]
        public void Is_Not_Valid_Json()
        {
            var jsonString = File.ReadAllText(@"TestData\sbdInvalid.json");
            var json = JsonSerializer.Deserialize<StandardBusinessDocument>(jsonString);

            Assert.NotNull(json);
        }

        /// <summary>
        /// Test valid xml arkivmelding from file
        /// </summary>
        [Fact]
        public void Is_Valid_Xml()
        {
            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                XmlSerializer serializer = new XmlSerializer(typeof(Arkivmelding));
                Arkivmelding arkivmelding = (Arkivmelding)serializer.Deserialize(fs);
                Assert.NotNull(arkivmelding);
                Assert.Equal(typeof(Arkivmelding), arkivmelding.GetType());
            }
        }

        /// <summary>
        /// Tests not empty file arkivmelding
        /// </summary>
        [Fact]
        public void Read_Not_Empty_XML_Test_Data()
        {
            using (FileStream fs = File.OpenRead(@"TestData\arkivmelding.xml"))
            {
                Assert.True(fs.Length > 0);
            }
        }

        /// <summary>
        /// Tests valid config in appsettings
        /// </summary>
        [Fact]
        public void Check_Valid_AppConfig()
        {
            var config = FixtureUnit.InitConfiguration();
            var baseUrlSetting = config["EFormidlingClientSettings:BaseUrl"];
            var baseUrlLocal = "http://localhost:9093/api/";

            Assert.Equal(baseUrlLocal, baseUrlSetting);
        }

        /// <summary>
        /// Tests invalid input to GetCapabilities()
        /// </summary>
        [Fact]
        public async void Get_Capabilities_Invalid_Input()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.GetCapabilities(string.Empty));
        }

        /// <summary>
        /// Tests invald input to UploadAttachment()
        /// </summary>
        [Fact]
        public async void Upload_Attachment_Invalid_Input()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.UploadAttachment(null, string.Empty, string.Empty));
        }

        /// <summary>
        /// Tests invalid input to CreateMessage()
        /// </summary>
        [Fact]
        public async void Create_Message_Invalid_Input()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.CreateMessage(null));
        }

        /// <summary>
        /// Tests invalid input to SubscribeeFormiding()
        /// </summary>
        [Fact]
        public async void SubscribeeFormidling_Invalid_Input()
        {
            var service = _serviceProvider.GetService<IEFormidlingClient>();
            ArgumentNullException ex = await Assert.ThrowsAsync<ArgumentNullException>(async () => await service.SubscribeeFormidling(null));
        }

        /// <summary>
        /// Tests that a custom created arkivmelding is valid according to its model
        /// </summary>
        [Fact]
        public async void Verify_Akrivmelding_Build()
        {
            var files = new List<string>();
            files.Add("skjema.xml");

            Arkivmelding arkivmelding = new Arkivmelding
            {
                AntallFiler = 1,
                Tidspunkt = DateTime.Now.ToString(),
                MeldingId = Guid.NewGuid().ToString(),
                System = "LandLord",
                Mappe = new List<Mappe>
                {
                    new Mappe
                    {
                        SystemID = Guid.NewGuid().ToString(),
                        Tittel = "Dette er en tittel",
                        OpprettetDato = DateTime.Now.ToString(),
                        Type = "saksmappe",
                        Basisregistrering = new Basisregistrering
                         {
                            Type = "journalpost",
                            SystemID = Guid.NewGuid().ToString(),
                            OpprettetDato = DateTime.UtcNow,
                            OpprettetAv = "LandLord",
                            ArkivertDato = DateTime.Now,
                            ArkivertAv = "LandLord",
                            Dokumentbeskrivelse = new Dokumentbeskrivelse
                            {
                                SystemID = Guid.NewGuid().ToString(),
                                Dokumenttype = "Bestilling",
                                Dokumentstatus = "Dokumentet er ferdigstilt",
                                Tittel = "Hei",
                                OpprettetDato = DateTime.UtcNow,
                                OpprettetAv = "LandLord",
                                TilknyttetRegistreringSom = "hoveddokument",
                                Dokumentnummer = 1,
                                TilknyttetDato = DateTime.Now,
                                TilknyttetAv = "Landlord",
                                Dokumentobjekt = new Dokumentobjekt
                                {
                                    Versjonsnummer = 1,
                                    Variantformat = "Produksjonsformat",
                                    OpprettetDato = DateTime.UtcNow,
                                    OpprettetAv = "LandLord",
                                    ReferanseDokumentfil = files,
                                },
                            },
                            Tittel = "Nye lysrør",
                            OffentligTittel = "Nye lysrør",
                            Journalposttype = "Utgående dokument",
                            Journalstatus = "Journalført",
                            Journaldato = DateTime.Now,
                         },
                    },
                },
            };

            MemoryStream stream = new MemoryStream();
            XmlSerializer serializer = new XmlSerializer(typeof(Arkivmelding));
            serializer.Serialize(stream, arkivmelding);

            using (MemoryStream ms = stream)
            {               
                stream.Seek(0, SeekOrigin.Begin);
                var verifiedArkivmelding = serializer.Deserialize(stream) as Arkivmelding;

                Assert.NotNull(arkivmelding);
                Assert.Equal(typeof(Arkivmelding), arkivmelding.GetType());
            }
        }
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="FixtureUnit"/> class.
    /// </summary>
    public class FixtureUnit
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
        /// Initializes a new instance of the <see cref="FixtureUnit"/> class.
        /// </summary>
        public FixtureUnit()
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
            _ = serviceCollection.AddTransient<IEFormidlingClient, Common.EFormidlingClient.EFormidlingClient>();
            ServiceProvider = serviceCollection.BuildServiceProvider();

            Guid obj = Guid.NewGuid();
            CustomGuid = obj.ToString();
        }

        /// <summary>
        ///  Gets the CustomGuid
        /// </summary>
        public static IConfiguration InitConfiguration()
        {
            var config = new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build();
            return config;
        }
    }
}
