using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.App;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.EFormidling.Implementation;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Options;
using Altinn.App.Core.Features.Validation;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.IntegrationTests;
using Altinn.App.IntegrationTests.Mocks.Authentication;
using Altinn.App.Services.Implementation;
using Altinn.Common.EFormidlingClient;
using Altinn.Platform.Authentication.Maskinporten;
using AltinnCore.Authentication.JwtCookie;

using App.IntegrationTests.Mocks.Services;
using App.IntegrationTestsRef.Data.apps.tdd.sirius.services;
using App.IntegrationTestsRef.Mocks.Services;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

using Moq;

namespace App.IntegrationTests.Utils
{
    public static class SetupUtil
    {
        public static HttpClient GetTestClient(
            CustomWebApplicationFactory<TestDummy> customFactory,
            string org,
            string app,            
            Mock<IData> dataMock = null,
            bool allowRedirect = true)
        {
            WebApplicationFactory<TestDummy> factory = customFactory.WithWebHostBuilder(builder =>
            {
                string path = GetAppPath(org, app);
                builder.ConfigureAppConfiguration((context, conf) =>
                    {
                        conf.AddJsonFile(path + "appsettings.json");
                    });

                var configuration = new ConfigurationBuilder()
                    .AddJsonFile(path + "appsettings.json")
                    .Build();

                configuration.GetSection("AppSettings:AppBasePath").Value = path;

                IConfigurationSection appSettingSection = configuration.GetSection("AppSettings");

                builder.ConfigureTestServices(services =>
                {
                    services.Configure<AppSettings>(appSettingSection);

                    services.AddSingleton<Altinn.Common.PEP.Interfaces.IPDP, PepWithPDPAuthorizationMockSI>();

                    services.AddTransient<IValidation, ValidationAppSI>();

                    services.AddTransient<IApplication, ApplicationMockSI>();
                    services.AddTransient<IInstance, InstanceMockSI>();
                    services.AddTransient<IInstanceEvent, InstanceEventAppSIMock>();
                    services.AddTransient<IEvents, EventsMockSI>();
                    services.AddTransient<IDSF, DSFMockSI>();
                    services.AddTransient<IER, ERMockSI>();
                    services.AddTransient<IRegister, RegisterMockSI>();
                    services.AddTransient<IAuthorization, AuthorizationMock>();

                    if (dataMock != null)
                    {
                        services.AddSingleton(dataMock.Object);
                    }
                    else
                    {
                        services.AddTransient<IData, DataMockSI>();
                    }

                    services.AddTransient<IPDF, PDFMockSI>();
                    services.AddTransient<IProfile, ProfileMockSI>();
                    services.AddTransient<IText, TextMockSI>();
                    services.AddTransient<IEFormidlingClient, EFormidlingClientMock>();

                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();
                    var defaultProviderService = services.Where(s => s.ServiceType == typeof(IAppOptionsProvider)).FirstOrDefault();
                    if (defaultProviderService == null)
                    {
                        services.AddTransient<IAppOptionsProvider, DefaultAppOptionsProvider>();
                    }

                    services.AddTransient<IInstanceAppOptionsProvider, InstanceAppOptionsProviderStub>();

                    switch (app)
                    {
                        case "endring-av-navn":
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.tdd.endring_av_navn.Instantiation>();
                            services.AddTransient<IAppOptionsProvider, Mocks.Apps.Ttd.EndringAvNavn.Options.CarbrandsAppOptionsProvider>();
                            services.AddTransient<IAppOptionsProvider, Mocks.Apps.Ttd.EndringAvNavn.Options.WeekdaysAppOptionsProvider>();
                            break;
                        case "custom-validation":
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.custom_validation.AltinnApp>();
                            services.AddTransient<IInstantiationValidator, Mocks.Apps.tdd.custom_validation.InstantiationHandler>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.tdd.custom_validation.InstantiationHandler>();
                            services.AddTransient<IInstanceValidator, Mocks.Apps.tdd.custom_validation.ValidationHandler>();
                            services.AddTransient<IDataProcessor, Mocks.Apps.tdd.custom_validation.DataProcessingHandler>();
                            break;
                        case "task-validation":
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.task_validation.AltinnApp>();
                            services.AddTransient<IInstantiationValidator, Mocks.Apps.tdd.task_validation.InstantiationHandler>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.tdd.task_validation.InstantiationHandler>();
                            services.AddTransient<IInstanceValidator, Mocks.Apps.tdd.task_validation.ValidationHandler>();
                            break;
                        case "platform-fails":
                            services.AddTransient<IInstance, InstancePlatformFailsMock>();
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.platform_fails.AltinnApp>();
                            break;
                        case "contributor-restriction":
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.contributer_restriction.AltinnApp>();
                            services.AddTransient<IInstantiationValidator, Mocks.Apps.tdd.contributer_restriction.InstantiationHandler>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.tdd.contributer_restriction.InstantiationHandler>();
                            break;
                        case "sirius":
                            services.AddSingleton<ISiriusApi, SiriusAPI>();
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.sirius.App>();
                            services.AddTransient<IProcessTaskEnd, Mocks.Apps.tdd.sirius.ProcessTaskEnd>();
                            services
                                .AddTransient<IInstanceValidator, Mocks.Apps.tdd.sirius.AppLogic.Validation.ValidationHandler>();
                            break;
                        case "events":
                            services.AddTransient<IAppModel, Mocks.Apps.ttd.events.AltinnApp>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.ttd.events.InstantiationHandler>();
                            break;
                        case "autodelete-true":
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.autodelete_true.AppModel>();
                            break;
                        case "nabovarsel":
                            services.AddTransient<IAppModel, Mocks.Apps.dibk.nabovarsel.AltinnApp>();
                            services.AddTransient<IInstanceValidator, Mocks.Apps.dibk.nabovarsel.ValidationHandler>();
                            services.AddTransient<IPdfFormatter, Mocks.Apps.dibk.nabovarsel.PdfHandler>();
                            break;
                        case "klareringsportalen":
                            services.AddTransient<IAppModel, Mocks.Apps.nsm.klareringsportalen.AppLogic.App>();
                            services.AddTransient<IInstantiationValidator, Mocks.Apps.nsm.klareringsportalen.AppLogic.InstantiationHandler>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.nsm.klareringsportalen.AppLogic.InstantiationHandler>();
                            break;
                        case "issue-5740":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.Issue5740.App>();
                            services.AddTransient<IPageOrder, Mocks.Apps.Ttd.Issue5740.PageOrder>();
                            break;
                        case "eformidling-app":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.EFormidling.App>();
                            services.AddTransient<IEFormidlingMetadata, Mocks.Apps.Ttd.EFormidling.EFormidlingMetadata>();
                            services.AddTransient<IEFormidlingReceivers, DefaultEFormidlingReceivers>();
                            services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
                            break;
                        case "eformidling-app-invalid":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.EFormidlingInvalid.App>();
                            services.AddTransient<IEFormidlingReceivers, DefaultEFormidlingReceivers>();
                            services.AddTransient<IEFormidlingService, DefaultEFormidlingService>();
                            break;
                        case "presentationfields-app":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.PresentationTextsApp.App>();
                            services.AddTransient<IDataProcessor, Mocks.Apps.Ttd.PresentationTextsApp.CalculationHandler>();
                            break;
                        case "datafields-app":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.DataFieldsApp.App>();
                            services.AddTransient<IProcessTaskEnd, Mocks.Apps.Ttd.DataFieldsApp.ProcessTaskEnd>();
                            break;
                        case "model-validation":
                            services.AddTransient<IAppModel, Mocks.Apps.ttd.model_validation.AltinnApp>();
                            services.AddTransient<IDataProcessor, Mocks.Apps.ttd.model_validation.CalculationHandler>();
                            services.AddTransient<IInstantiationValidator, Mocks.Apps.ttd.model_validation.InstantiationHandler>();
                            services.AddTransient<IInstantiationProcessor, Mocks.Apps.ttd.model_validation.InstantiationHandler>();
                            services.AddTransient<IInstanceValidator, Mocks.Apps.ttd.model_validation.ValidationHandler>();
                            break;
                        case "dayplanner":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.Dayplanner.App>();
                            services.AddTransient<IDataProcessor, Mocks.Apps.Ttd.Dayplanner.DataProcessingHandler>();
                            break;
                        case "externalprefil":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.Externalprefil.App>();
                            break;
                        case "dynamic-options-pdf":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.DynamicOptionsPdf.App>();
                            break;
                        case "anonymous-stateless":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.AnonymousStateless.App>();
                            services.AddTransient<IDataProcessor, Mocks.Apps.Ttd.AnonymousStateless.DataProcessingHandler>();
                            break;
                        case "abandon-task":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.Abandon.App>();
                            services.AddTransient<IProcessTaskAbandon, Mocks.Apps.Ttd.Abandon.ProcessTaskAbandon>();
                            break;
                        case "autodelete-data":
                        case "confirm-autodelete-data":
                            services.AddTransient<IAppModel, Mocks.Apps.Ttd.AutoDeleteData.App>();
                            services.AddTransient<IProcessTaskEnd, Mocks.Apps.Ttd.AutoDeleteData.ProcessTaskEnd>();
                            break;
                        default:
                            services.AddTransient<IAppModel, Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                    }
                });
            });
            var opts = new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = allowRedirect
            };
            factory.Server.AllowSynchronousIO = true;            
            return factory.CreateClient(opts);
        }

        public static void AddAuthCookie(HttpRequestMessage requestMessage, string token, string xsrfToken = null)
        {
            requestMessage.Headers.Add("Cookie", Altinn.App.Core.Constants.General.RuntimeCookieName + "=" + token);
            if (xsrfToken != null)
            {
                requestMessage.Headers.Add("X-XSRF-TOKEN", xsrfToken);
            }
        }

        public static string GetXsrfCookieValue(HttpResponseMessage response)
        {
            List<string> cookieHeaders = response.Headers.GetValues("Set-Cookie").ToList();

            foreach (string cookieHeader in cookieHeaders)
            {
                if (cookieHeader.StartsWith("XSRF-TOKEN"))
                {
                    return cookieHeader.Substring(11).Split(";")[0];
                }
            }

            return null;
        }

        public static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.Location).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/apps/{org}/{app}/");
        }

        public class InstanceAppOptionsProviderStub : IInstanceAppOptionsProvider
        {
            public string Id => "answers";

            public Task<AppOptions> GetInstanceAppOptionsAsync(InstanceIdentifier instanceIdentifier, string language, Dictionary<string, string> keyValuePairs)
            {
                var appOptions = new AppOptions()
                {
                    IsCacheable = false,
                    Options = new List<AppOption>()
                    {
                        new AppOption()
                        {
                            Value = "42",
                            Label = "The answer to life the universe and everything"
                        }
                    }
                };

                return Task.FromResult(appOptions);
            }
        }
    }
}
