using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Xunit;

namespace App.IntegrationTestsRef.Implementation.PdfService
{
    public class PdfServiceTest3 : PdfServiceTestsBase
    {
        public PdfServiceTest3() : base("tdd", "dynamic-options-2")
        {
        }

        [Fact]
        public async Task GenerateAndStorePdf_MappingsToSecureOptions_ShouldPassCorrectOptionsData()
        {
            // Arrange
            string postedPdfContextJson = string.Empty;
            Altinn.App.Core.Internal.Pdf.PdfService pdfService = BuildPdfService((requestMessage, cancellationToken) =>
            {
                postedPdfContextJson = requestMessage.Content.ReadAsStringAsync(cancellationToken).Result;
            });

            // Act
            await pdfService.GenerateAndStoreReceiptPDF(GetInstance(), "Task_1", GetDataElement(), typeof(IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models.Flyttemelding));

            // Assert
            var pdfContext = JsonSerializer.Deserialize<PDFContext>(postedPdfContextJson, new JsonSerializerOptions() { PropertyNameCaseInsensitive = true });

            pdfContext.OptionsDictionary["fylker"].Values.Should().Contain("46");
            pdfContext.OptionsDictionary["kommuner"].Keys.Count.Should().Be(84);
            pdfContext.OptionsDictionary["kommuner"].Values.Should().Contain("4640");
            pdfContext.OptionsDictionary["kommuner"].Keys.Should().Contain("Sogndal");
            pdfContext.OptionsDictionary["kommuner"].Values.Should().Contain("1813");
            pdfContext.OptionsDictionary["kommuner"].Keys.Should().Contain("Brønnøy");
            pdfContext.OptionsDictionary["children"].Keys.Should().Contain("Ole");
        }

        private Instance GetInstance()
        {
            return new Instance()
            {
                Id = "1337/50368f87-3b95-4702-9ff7-3e0eb8501883",
                InstanceOwner = new InstanceOwner()
                {
                    PartyId = "1337",
                    PersonNumber = "01039012345"
                },
                AppId = $"{Org}/{App}",
                Org = Org,
                Process = new ProcessState()
                {
                    Started = new DateTime(2022, 3, 21, 13, 41, 5),
                    StartEvent = "StartEvent_1",
                    Ended = new DateTime(2022, 3, 21, 13, 41, 7),
                    EndEvent = "EndEvent_1"
                }
            };
        }

        private static DataElement GetDataElement()
        {
            return new DataElement()
            {
                Id = "9eac88a2-1060-4b86-aba6-3b39bcbad29f",
                DataType = "Flyttemelding",
                ContentType = "application/xml",
                Size = 0,
                Locked = true,
                IsRead = true,
                Tags = new List<string>(),
                LastChanged = new DateTime(2022, 3, 21, 13, 41, 6)
            };
        }

        internal override IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models.Flyttemelding GetFormData()
        {
            return new IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models.Flyttemelding()
            {
                FlytterFra = new IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models.FylkeKommune() { Fylke = "18", Kommune = "1813" },
                FlytterTil = new IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models.FylkeKommune() { Fylke = "46", Kommune = "4640" },
                Child = "1"
            };
        }

        internal override List<IAppOptionsProvider> GetAppOptionProviders(IOptions<AppSettings> appOptions)
        {
            return new List<IAppOptionsProvider>()
                {
                    new IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Options.CommuneAppOptionsProvider(new AppOptionsFileHandler(appOptions)),
                    new DefaultAppOptionsProvider(new AppOptionsFileHandler(appOptions))
                };
        }
    }
}
