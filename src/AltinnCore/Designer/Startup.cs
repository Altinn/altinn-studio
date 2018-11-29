using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Designer.Authorization;
using AltinnCore.Designer.ModelBinding;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Mvc.Razor.Internal;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
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
            bool loadFromPackage = false;
            if (loadFromPackage)
            {
                services.AddSingleton<IExecution, ExecutionSIIntegrationTest>();
            }
            else
            {
                services.AddSingleton<IExecution, ExecutionSILocalDev>();
            }

            services.AddSingleton<IArchive, ArchiveSILocalDev>();
            services.AddSingleton<IAuthorization, AuthorizationSILocalDev>();
            services.AddSingleton<ICodeGeneration, CodeGenerationSI>();
            services.AddSingleton<ICompilation, CompilationSI>();
            services.AddSingleton<IViewCompiler, CustomRoslynCompilationService>();
            services.AddSingleton<IDataSourceService, DataSourceSI>();
            services.AddTransient<IDefaultFileFactory, DefaultFileFactory>();
            services.AddSingleton<IForm, FormSILocalDev>();
            services.AddSingleton<IProfile, ProfileSILocalDev>();
            services.AddSingleton<IRegister, RegisterSILocalDev>();
            services.AddSingleton<IRepository, RepositorySI>();
            services.AddSingleton<IServicePackageRepository, RepositorySI>();
            services.AddSingleton<ITestingRepository, TestingRepository>();
            services.AddSingleton<IGitea, GiteaAPIWrapper>();
            services.AddSingleton<ISourceControl, SourceControlSI>();
            services.AddSingleton<ITestdata, TestdataSIDesigner>();
            services.AddSingleton(Configuration);
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            services.AddResponseCompression();

            // TODO: Figure out how appsettings.json parses values and merges with environment variables and use these here.
            // Since ":" is not valid in environment variables names in kubernetes, we can't use current docker-compose environment variables
            string repoLocation = null;

            if (Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") != null)
            {
                repoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation");
            }
            else
            {
                repoLocation = Configuration["ServiceRepositorySettings:RepositoryLocation"];
            }

            if (!Directory.Exists(repoLocation))
            {
                Directory.CreateDirectory(repoLocation);
            }

            services.Configure<ServiceRepositorySettings>(Configuration.GetSection("ServiceRepositorySettings"));
            services.Configure<TestdataRepositorySettings>(Configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));

            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
                .AddCookie(options =>
                {
                    options.AccessDeniedPath = "/Home/NotAuthorized/";
                    options.LoginPath = "/Home/Login/";
                    options.LogoutPath = "/Home/Logout/";
                    options.Events = new CookieAuthenticationEvents
                    {
                        // Add Custom Event handler to be able to redirect users for authentication upgrade
                        OnRedirectToAccessDenied = NotAuthorizedHandler.RedirectToNotAuthorized,
                    };
                });

            var mvc = services.AddMvc().SetCompatibilityVersion(CompatibilityVersion.Version_2_1);
            mvc.Services.Configure<MvcOptions>(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new AltinnCoreApiModelBinderProvider());
                options.ModelBinderProviders.Insert(1, new AltinnCoreCollectionModelBinderProvider());
            });
            mvc.AddXmlSerializerFormatters();

            services.AddLocalization();
            services.Configure<RequestLocalizationOptions>(
                options =>
                {
                    var supportedCultures = new List<CultureInfo>
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
        }

        /// <summary>
        /// Configure the application.
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configure-method"/>
        /// </summary>
        /// <param name="app">The application builder</param>
        /// <param name="env">Hosting environment</param>
        public void Configure(IApplicationBuilder app, IHostingEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/Error");
            }

            // app.UseHsts();
            // app.UseHttpsRedirection();
            app.UseAuthentication();

            app.UseResponseCompression();
            app.UseRequestLocalization();
            app.UseStaticFiles(new StaticFileOptions()
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

            app.UseMvc(routes =>
            {
                // ------------------------- DEV ----------------------------- //
                routes.MapRoute(
                    name: "orgRoute",
                    template: "designer/{org}/{controller}/{action=Index}/",
                    defaults: new { controller = "Owner" },
                    constraints: new
                    {
                        controller = "Codelist|Owner|Config",
                    });

                routes.MapRoute(
                        name: "serviceDevelopmentRoute",
                        template: "designer/{org}/{service}",
                        defaults: new { controller = "ServiceDevelopment", action="index" });

                routes.MapRoute(
                          name: "serviceRoute",
                          template: "designer/{org}/{service}/{controller}/{action=Index}/{id?}",
                          defaults: new { controller = "Service" },
                          constraints: new
                          {
                              controller = @"(Codelist|Config|DataSource|Service|ManualTesting|Model|Rules|ServiceMetadata|Testing|Text|UI|Workflow|UIEditor|ServiceDevelopment|Deploy|Language)",

                              service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                              id = "[a-zA-Z0-9_\\-]{1,30}",
                          });        

                // -------------------------- DEFAULT ------------------------- //
                routes.MapRoute(
                   name: "defaultRoute2",
                   template: "{controller}/{action=StartPage}/{id?}",
                   defaults: new { controller = "Home" });

                routes.MapRoute(
                    name: "defaultRoute",
                    template: "{action=StartPage}/{id?}",
                    defaults: new { controller = "Home" });
            });
        }
    }
}
