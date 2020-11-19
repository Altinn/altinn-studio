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

                    services.AddSingleton<IValidation, ValidationAppSI>();

                    services.AddTransient<IApplication, ApplicationMockSI>();
                    services.AddTransient<IInstance, InstanceMockSI>();
                    services.AddTransient<IData, DataMockSI>();
                    services.AddTransient<IInstanceEvent, InstanceEventAppSIMock>();
                    services.AddTransient<IEvents, EventsMockSI>();
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
                        case "endring-av-navn":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
                            break;
                        case "custom-validation":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.custom_validation.AltinnApp>();
                            break;
                        case "task-validation":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.task_validation.AltinnApp>();
                            break;
                        case "platform-fails":
                            services.AddSingleton<IInstance, InstancePlatformFailsMock>();
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.platform_fails.AltinnApp>();
                            break;
                        case "contributor-restriction":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.contributer_restriction.AltinnApp>();
                            break;
                        case "sirius":
                            services.AddSingleton<ISiriusApi, SiriusAPI>();
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.sirius.App>();
                            break;
                        case "events":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.ttd.events.AltinnApp>();
                            break;
                        case "autodelete-true":
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.autodelete_true.AltinnApp>();
                            break;                            
                        default:
                            services.AddSingleton<IAltinnApp, IntegrationTests.Mocks.Apps.tdd.endring_av_navn.AltinnApp>();
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
