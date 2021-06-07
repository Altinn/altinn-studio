using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;

using Altinn.App;
using Altinn.App.IntegrationTests;
using Altinn.App.IntegrationTests.Mocks.Authentication;
using Altinn.App.PlatformServices.Interface;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
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

namespace App.IntegrationTestsRef.Utils
{
    public static class SetupUtil
    {
        public static HttpClient GetTestClient(
            CustomWebApplicationFactory<Startup> customFactory,
            string org,
            string app)
        {
            WebApplicationFactory<Startup> factory = customFactory.WithWebHostBuilder(builder =>
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
                    services.AddTransient<IData, DataMockSI>();
                    services.AddTransient<IInstanceEvent, InstanceEventAppSIMock>();
                    services.AddTransient<IEvents, EventsMockSI>();
                    services.AddTransient<IDSF, DSFMockSI>();
                    services.AddTransient<IER, ERMockSI>();
                    services.AddTransient<IRegister, RegisterMockSI>();
                    services.AddTransient<IAuthorization, AuthorizationMock>();

                    services.AddTransient<IPDF, PDFMockSI>();
                    services.AddTransient<IProfile, ProfileMockSI>();
                    services.AddTransient<IText, TextMockSI>();
                    services.AddTransient<IEFormidlingClient, EFormidlingClientMock>();

                    services.AddSingleton<ISigningKeysRetriever, SigningKeysRetrieverStub>();
                    services.AddSingleton<IPostConfigureOptions<JwtCookieOptions>, JwtCookiePostConfigureOptionsStub>();

                    switch (app)
                    {
                        case "endring-av-navn":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                        case "custom-validation":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.custom_validation.AltinnApp>();
                            break;
                        case "task-validation":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.task_validation.AltinnApp>();
                            break;
                        case "platform-fails":
                            services.AddTransient<IInstance, InstancePlatformFailsMock>();
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.platform_fails.AltinnApp>();
                            break;
                        case "contributor-restriction":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.contributer_restriction.AltinnApp>();
                            break;
                        case "sirius":
                            services.AddSingleton<ISiriusApi, SiriusAPI>();
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.sirius.App>();
                            break;
                        case "events":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.ttd.events.AltinnApp>();
                            break;
                        case "autodelete-true":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.autodelete_true.AltinnApp>();
                            break;
                        case "nabovarsel":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.dibk.nabovarsel.AltinnApp>();
                            break;
                        case "klareringsportalen":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.nsm.klareringsportalen.AppLogic.App>();
                            break;
                        case "issue-5740":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.Ttd.Issue5740.App>();
                            break;
                        case "eformidling-app":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.Ttd.EFormidling.App>();
                            break;
                        case "eformidling-app-invalid":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.Ttd.EFormidlingInvalid.App>();
                            break;
                        case "presentationfields-app":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.Ttd.PresentationTextsApp.App>();
                            break;
                        case "datafields-app":
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.Ttd.DataFieldsApp.App>();
                            break;
                        case "model-validation":
                            services.AddTransient<IAltinnApp, App.IntegrationTests.Mocks.Apps.ttd.model_validation.AltinnApp>();
                            break;
                        case "dayplanner":
                            services.AddTransient<IAltinnApp, App.IntegrationTests.Mocks.Apps.Ttd.Dayplanner.App>();
                            break;
                        default:
                            services.AddTransient<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                    }
                });
            });
            factory.Server.AllowSynchronousIO = true;
            return factory.CreateClient();
        }

        public static void AddAuthCookie(HttpRequestMessage requestMessage, string token, string xsrfToken = null)
        {
            requestMessage.Headers.Add("Cookie", Altinn.App.Services.Constants.General.RuntimeCookieName + "=" + token);
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

        private static string GetAppPath(string org, string app)
        {
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(InstanceMockSI).Assembly.CodeBase).LocalPath);
            return Path.Combine(unitTestFolder, $"../../../Data/Apps/{org}/{app}/");
        }
    }
}
