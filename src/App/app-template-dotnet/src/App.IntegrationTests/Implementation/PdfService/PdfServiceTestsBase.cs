using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Pdf;
using Altinn.App.Core.Implementation;
using Altinn.App.Core.Infrastructure.Clients.Pdf;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Pdf;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Enums;
using App.IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Options;
using App.IntegrationTests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.FeatureManagement;
using Moq;
using Moq.Protected;

namespace App.IntegrationTestsRef.Implementation.PdfService
{
    public abstract class PdfServiceTestsBase
    {
        public string Org { get; }

        public string App { get; }

        protected PdfServiceTestsBase(string org, string app)
        {
            Org = org;
            App = app;
        }

        internal abstract object GetFormData();

        internal abstract List<IAppOptionsProvider> GetAppOptionProviders(IOptions<AppSettings> appOptions);

        internal virtual Mock<IHttpContextAccessor> MockUserInHttpContext()
        {
            var user = PrincipalUtil.GetUserPrincipal(1313);
            var httpContextAccessor = new Mock<IHttpContextAccessor>();
            httpContextAccessor.Setup(s => s.HttpContext.User).Returns(user);

            return httpContextAccessor;
        }

        internal virtual Mock<IProfile> MockProfileClient()
        {
            var userProfile = new UserProfile()
            {
                UserId = 1337,
                UserName = "SophieDDG",
                PhoneNumber = "90001337",
                Email = "1337@altinnstudiotestusers.com",
                PartyId = 1337,
                Party = new Altinn.Platform.Register.Models.Party
                {
                    PartyId = 1337,
                    PartyTypeName = PartyType.Person
                },
                UserType = Altinn.Platform.Profile.Enums.UserType.SelfIdentified,
                ProfileSettingPreference = new ProfileSettingPreference()
            };

            var profileClient = new Mock<IProfile>();
            profileClient.Setup(s => s.GetUserProfile(It.IsAny<int>())).ReturnsAsync(() => userProfile);

            return profileClient;
        }

        internal virtual Mock<IData> MockDataClient()
        {
            object formData = GetFormData();

            var dataClient = new Mock<IData>();
            dataClient.Setup(s => s.GetFormData(It.IsAny<Guid>(), It.IsAny<Type>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>())).ReturnsAsync(() => formData);

            return dataClient;
        }

        internal virtual PDFClient MockPdfClient(Action<HttpRequestMessage, CancellationToken> onDataPostCallback)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage()
                {
                    StatusCode = System.Net.HttpStatusCode.Created,
                    Content = new StreamContent(new MemoryStream())
                })
                .Callback(onDataPostCallback)
                .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object);
            var platformSettings = new PlatformSettings()
            {
                ApiPdfEndpoint = @"http://localhost/not-in-use"
            };
            var platformOptions = Options.Create(platformSettings);
            var pdfClient = new PDFClient(platformOptions, httpClient);

            return pdfClient;
        }

        internal virtual AppResourcesSI BuildAppResourcesService()
        {
            var appOptionSettings = BuildAppOptionSettings();
            var featureManager = new Mock<IFeatureManager>();
            featureManager.Setup(s => s.IsEnabledAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
            var appMetadataService = new AppMetadata(appOptionSettings, new FrontendFeatures(featureManager.Object)); 
            var appResources = new AppResourcesSI(appOptionSettings, appMetadataService, null, null);

            return appResources;
        }

        internal virtual AppOptionsService BuildAppOptionsService()
        {
            var appOptionSettings = BuildAppOptionSettings();
            var appOptionsFactory = new AppOptionsFactory(GetAppOptionProviders(appOptionSettings));
            var instanceAppOptionsFactory = new InstanceAppOptionsFactory(
                new List<IInstanceAppOptionsProvider>()
                {
                    new ChildrenAppOptionsProvider()
                });

            return new AppOptionsService(appOptionsFactory, instanceAppOptionsFactory);
        }

        internal virtual IOptions<AppSettings> BuildAppOptionSettings()
        {
            var appSettings = new AppSettings()
            {
                AppBasePath = SetupUtil.GetAppPath(Org, App)
            };

            return Options.Create(appSettings);
        }

        internal virtual IOptions<GeneralSettings> BuildGeneralSettings()
        {
            var generalSettings = new GeneralSettings()
            {

            };
            return Options.Create(generalSettings);
        }

        internal virtual IOptions<PdfGeneratorSettings> BuildPdfGeneratorSettings()
        {
            var pdfGeneratorSettings = new PdfGeneratorSettings();
            return Options.Create(pdfGeneratorSettings);
        }

        internal virtual Altinn.App.Core.Internal.Pdf.PdfService BuildPdfService(Action<HttpRequestMessage, CancellationToken> onDataPostCallback)
        {
            PDFClient pdfClient = MockPdfClient(onDataPostCallback);
            AppResourcesSI appResources = BuildAppResourcesService();
            IAppOptionsService appOptionsService = BuildAppOptionsService();
            Mock<IData> dataClient = MockDataClient();
            Mock<IHttpContextAccessor> httpContextAccessor = MockUserInHttpContext();
            Mock<IProfile> profileClient = MockProfileClient();
            Mock<IPdfGeneratorClient> pdfGeneratorClientMock = new Mock<IPdfGeneratorClient>();
            var registerClient = new Mock<IRegister>();
            var customPdfHandler = new NullPdfFormatter();
            var pdfOptionsMapping = new PdfOptionsMapping(appOptionsService);
            var pdfGeneratorSettings =BuildPdfGeneratorSettings();
            var generalSettings = BuildGeneralSettings();

            var pdfService = new Altinn.App.Core.Internal.Pdf.PdfService(pdfClient, appResources, pdfOptionsMapping, dataClient.Object, httpContextAccessor.Object, profileClient.Object, registerClient.Object, customPdfHandler, pdfGeneratorClientMock.Object, pdfGeneratorSettings, generalSettings);

            return pdfService;
        }
    }
}
