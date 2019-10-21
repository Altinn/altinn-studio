using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Authorization;
using AltinnCore.Designer.ModelBinding;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Net.Http.Headers;

namespace AltinnCore.Designer
{
    /// <summary>
    /// This is the class that set up the application during startup
    /// <see href="https://docs.asp.net/en/latest/fundamentals/startup.html#the-startup-class"/>
    /// </summary>
    public class Startup
    {
        /// <summary>
        /// Gets the application configuration
        /// </summary>
        public IConfiguration Configuration { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="Startup"/> class
        /// </summary>
        /// <param name="configuration">the configuration for designer</param>
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        /// <summary>
        /// Configures the services available for the asp.net Core application
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configureservices-method"/>
        /// </summary>
        /// <param name="services">The services available for asp.net Core</param>
        public void ConfigureServices(IServiceCollection services)
        {
            // Adding services to Dependency Injection TODO: Make this environment specific
            services.AddSingleton<IExecution, ExecutionStudioSI>();
            services.AddSingleton<IInstance, InstanceStudioSI>();
            services.AddSingleton<IData, DataStudioSI>();
            services.AddSingleton<IWorkflow, WorkflowStudioSI>();
            services.AddSingleton<ITestdata, TestdataStudioSI>();
            services.AddSingleton<IDSF, RegisterDSFStudioSI>();
            services.AddSingleton<IER, RegisterERStudioSI>();
            services.AddSingleton<IRegister, RegisterStudioSI>();
            services.AddSingleton<IProfile, ProfileStudioSI>();

            services.AddSingleton<IArchive, ArchiveStudioSI>();
            services.AddSingleton<IAuthorization, AuthorizationStudioSI>();
            services.AddSingleton<ICompilation, CompilationSI>();
            services.AddSingleton<IViewCompiler, CustomRoslynCompilationService>();
            services.AddTransient<IDefaultFileFactory, DefaultFileFactory>();
            services.AddSingleton<IForm, FormStudioSI>();
            services.AddSingleton<IRepository, RepositorySI>();
            services.AddSingleton<IServicePackageRepository, RepositorySI>();
            services.AddSingleton<IGitea, GiteaAPIWrapper>();
            services.AddSingleton<ISourceControl, SourceControlSI>();
            services.AddSingleton<ITestdata, TestdataStudioSI>();
            services.AddSingleton<IApplication, ApplicationStudioSI>();
            services.AddSingleton(Configuration);
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.AddMemoryCache();
            services.AddResponseCompression();

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string repoLocation = (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
                                ? Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation")
                                : Configuration["ServiceRepositorySettings:RepositoryLocation"];

            if (!Directory.Exists(repoLocation))
            {
                Directory.CreateDirectory(repoLocation);
            }

            services.AddControllers().AddNewtonsoftJson();
            services.AddMvc(options => options.EnableEndpointRouting = false);
            services.Configure<ServiceRepositorySettings>(Configuration.GetSection("ServiceRepositorySettings"));
            services.Configure<TestdataRepositorySettings>(Configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<KeyVaultSettings>(Configuration.GetSection("kvSetting"));
            services.Configure<CertificateSettings>(Configuration);
            services.Configure<CertificateSettings>(Configuration.GetSection("CertificateSettings"));

            services.AddRazorPages();

            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddJwtCookie(JwtCookieDefaults.AuthenticationScheme, options =>
                {
                    options.ExpireTimeSpan = new TimeSpan(0, 30, 0);
                    options.Cookie.Name = Common.Constants.General.RuntimeCookieName;
                })
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = "/Home/NotAuthorized/";
                    options.LoginPath = "/Home/Login/";
                    options.LogoutPath = "/Home/Logout/";
                    options.Cookie.Name = Common.Constants.General.DesignerCookieName;
                    options.Events = new CookieAuthenticationEvents
                    {
                        // Add Custom Event handler to be able to redirect users for authentication upgrade
                        OnRedirectToAccessDenied = NotAuthorizedHandler.RedirectToNotAuthorized,
                    };
                });

            string applicationInsightTelemetryKey = GetApplicationInsightsKeyFromEnvironment();
            if (!string.IsNullOrEmpty(applicationInsightTelemetryKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightTelemetryKey);
                services.AddApplicationInsightsKubernetesEnricher();
            }

            IMvcBuilder mvc = services.AddControllers().AddControllersAsServices();
            mvc.Services.AddRazorPages();

            mvc.Services.Configure<MvcOptions>(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new AltinnCoreApiModelBinderProvider());                
            });
            mvc.AddXmlSerializerFormatters();

            services.AddLocalization();
            services.Configure<RequestLocalizationOptions>(
                options =>
                {
                    List<CultureInfo> supportedCultures = new List<CultureInfo>
                        {
                            // The current supported languages. Can easily be added more.
                            new CultureInfo("en-US"),
                            new CultureInfo("nb-NO"),
                            new CultureInfo("nn-NO"),
                        };

                    options.DefaultRequestCulture = new RequestCulture(culture: "nb-NO", uiCulture: "nb-NO");
                    options.SupportedCultures = supportedCultures;
                    options.SupportedUICultures = supportedCultures;
                });
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));
        }

        /// <summary>
        /// Configure the application.
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configure-method"/>
        /// </summary>
        /// <param name="appBuilder">The application builder</param>
        /// <param name="env">Hosting environment</param>
        public void Configure(IApplicationBuilder appBuilder, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                appBuilder.UseDeveloperExceptionPage();
            }
            else
            {
                appBuilder.UseExceptionHandler("/Error");
            }

            appBuilder.UseStaticFiles(new StaticFileOptions()
            {
                OnPrepareResponse = (context) =>
                {
                    var headers = context.Context.Response.GetTypedHeaders();
                    headers.CacheControl = new CacheControlHeaderValue()
                    {
                        Public = true,
                        MaxAge = TimeSpan.FromMinutes(60),
                    };
                },
            });

            appBuilder.UseRouting();

            // appBuilder.UseHsts();
            // appBuilder.UseHttpsRedirection();
            appBuilder.UseAuthentication();
            appBuilder.UseAuthorization();

            appBuilder.UseResponseCompression();
            appBuilder.UseRequestLocalization();
            
            appBuilder.UseEndpoints(endpoints =>
            {
                // ------------------------- DEV ----------------------------- //
                endpoints.MapControllerRoute(
                    name: "orgRoute",
                    pattern: "designer/{org}/{controller}/{action=Index}/",
                    defaults: new { controller = "Config" },
                    constraints: new
                    {
                        controller = "Codelist|Config",
                    });

                endpoints.MapControllerRoute(
                        name: "serviceDevelopmentRoute",
                        pattern: "designer/{org}/{app}",
                        defaults: new { controller = "ServiceDevelopment", action = "index" });

                endpoints.MapControllerRoute(
                    name: "designerApiRoute",
                    pattern: "designerapi/{controller}/{action=Index}/{id?}",
                    defaults: new { controller = "Repository" },
                    constraints: new
                    {
                        controller = @"(Repository|Language|User)",
                    });
                endpoints.MapControllerRoute(
                          name: "serviceRoute",
                          pattern: "designer/{org}/{app}/{controller}/{action=Index}/{id?}",
                          defaults: new { controller = "Service" },
                          constraints: new
                          {
                              controller = @"(Codelist|Config|Service|RuntimeAPI|ManualTesting|Model|Rules|ServiceMetadata|Text|UI|UIEditor|ServiceDevelopment)",
                              app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                              id = "[a-zA-Z0-9_\\-]{1,30}",
                          });
                endpoints.MapControllerRoute(
                          name: "appRoute",
                          pattern: "designer/{org}/{app}/{controller}/{action=Index}/{id?}",
                          defaults: new { controller = "Deploy" },
                          constraints: new
                          {
                              controller = @"(Deploy)",
                          });
                endpoints.MapControllerRoute(
                        name: "applicationMetadataApiRoute",
                        pattern: "designer/api/v1/{org}/{app}",
                        defaults: new { controller = "ApplicationMetadata", action = "ApplicationMetadata" });

                endpoints.MapControllerRoute(
                        name: "reposRoute",
                        pattern: "{controller}/{action}/",
                        defaults: new { controller = "RedirectController" });

                // -------------------------- DEFAULT ------------------------- //
                endpoints.MapControllerRoute(
                   name: "defaultRoute2",
                   pattern: "{controller}/{action=StartPage}/{id?}",
                   defaults: new { controller = "Home" });

                endpoints.MapControllerRoute(
                    name: "defaultRoute",
                    pattern: "{action=StartPage}/{id?}",
                    defaults: new { controller = "Home" });
            });
        }

        /// <summary>
        ///  Gets telemetry instrumentation key from environment, which we set in Program.cs
        /// </summary>
        /// <returns>Telemetry instrumentation key</returns>
        public string GetApplicationInsightsKeyFromEnvironment()
        {
            string evironmentKey = Environment.GetEnvironmentVariable("ApplicationInsights--InstrumentationKey");
            if (string.IsNullOrEmpty(evironmentKey))
            {
                return null;
            }

            return evironmentKey;
        }
    }
}
