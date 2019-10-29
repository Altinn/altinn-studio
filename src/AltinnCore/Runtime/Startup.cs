using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Net;
using System.Reflection;
using System.Security.Cryptography.X509Certificates;
using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Clients;
using AltinnCore.Common.Configuration;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using AltinnCore.Runtime.Authorization;
using AltinnCore.Runtime.ModelBinding;
using AltinnCore.ServiceLibrary.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Net.Http.Headers;
using Microsoft.OpenApi.Models;

namespace AltinnCore.Runtime
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

        // This method gets called by the runtime. Use this method to add services to the container.
        // For more information on how to configure your application, visit https://go.microsoft.com/fwlink/?LinkID=398940

        /// <summary>
        /// Configures the services available for the asp.net Core application
        /// <see href="https://docs.microsoft.com/en-us/aspnet/core/fundamentals/startup#the-configureservices-method"/>
        /// </summary>
        /// <param name="services">The services available for asp.net Core</param>
        public void ConfigureServices(IServiceCollection services)
        {
            string runtimeMode = string.Empty;
            if (Environment.GetEnvironmentVariable("GeneralSettings__RuntimeMode") != null)
            {
                runtimeMode = Environment.GetEnvironmentVariable("GeneralSettings__RuntimeMode");
            }
            else
            {
                runtimeMode = Configuration["GeneralSettings:RuntimeMode"];
            }

            // Adding services to Dependency Injection TODO: Make this environment specific
            if (string.IsNullOrEmpty(runtimeMode) || !runtimeMode.Equals("ServiceContainer"))
            {
                services.AddSingleton<IExecution, ExecutionStudioSI>();
                services.AddSingleton<IInstance, InstanceStudioSI>();
                services.AddSingleton<IData, DataStudioSI>();
                services.AddSingleton<IWorkflow, WorkflowStudioSI>();
                services.AddSingleton<IProcess, ProcessStudioSI>();
                services.AddSingleton<ITestdata, TestdataStudioSI>();
                services.AddSingleton<IDSF, RegisterDSFStudioSI>();
                services.AddSingleton<IER, RegisterERStudioSI>();
                services.AddSingleton<IRegister, RegisterStudioSI>();
                services.AddSingleton<IProfile, ProfileStudioSI>();
                services.AddSingleton<IInstanceEvent, InstanceEventStudioSI>();
                services.AddSingleton<IAuthorization, AuthorizationStudioSI>();
                services.AddSingleton<IAuthentication, AuthenticationStudioSI>();
                services.AddSingleton<IHttpClientAccessor, HttpClientAccessor>();
                services.AddSingleton<IApplication, ApplicationStudioSI>();
            }
            else
            {
                // Services added if code is running in app
                services.AddSingleton<IExecution, ExecutionAppSI>();
                services.AddSingleton<IDSF, RegisterDSFAppSI>();
                services.AddSingleton<IER, RegisterERAppSI>();
                services.AddSingleton<IRegister, RegisterAppSI>();
                services.AddSingleton<IProfile, ProfileAppSI>();
                services.AddSingleton<IInstance, InstanceAppSI>();
                services.AddSingleton<IData, DataAppSI>();
                services.AddSingleton<IWorkflow, WorkflowAppSI>();
                services.AddSingleton<IProcess, ProcessAppSI>();
                services.AddSingleton<ITestdata, TestdataAppSI>();
                services.AddSingleton<IInstanceEvent, InstanceEventAppSI>();
                services.AddSingleton<IHttpClientAccessor, HttpClientAccessor>();
                services.AddSingleton<IAuthorization, AuthorizationAppSI>();
                services.AddSingleton<IAuthentication, AuthenticationAppSI>();
                services.AddSingleton<IApplication, ApplicationAppSI>();
            }

            services.AddSingleton<IPlatformServices, PlatformStudioSI>();
            services.AddSingleton<IArchive, ArchiveStudioSI>();
            services.AddSingleton<IAuthorizationHandler, InstanceAccessHandler>();
            services.AddSingleton<IAuthorizationHandler, ServiceAccessHandler>();
            services.AddSingleton<ICompilation, CompilationSI>();
            services.AddSingleton<IViewCompiler, CustomRoslynCompilationService>();
            services.AddTransient<IDefaultFileFactory, DefaultFileFactory>();
            services.AddSingleton<IForm, FormStudioSI>();
            services.AddSingleton<IRepository, RepositorySI>();
            services.AddSingleton<IServicePackageRepository, RepositorySI>();
            services.AddSingleton<IGitea, GiteaAPIWrapper>();
            services.AddSingleton<ISourceControl, SourceControlSI>();
            services.AddSingleton<IPrefill, PrefillSI>();
            services.AddSingleton(Configuration);
            services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddResponseCompression();

            string repoLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ?? Configuration["ServiceRepositorySettings:RepositoryLocation"];

            if (!Directory.Exists(repoLocation))
            {
                Directory.CreateDirectory(repoLocation);
            }

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            services.AddMvc().AddNewtonsoftJson();
            services.Configure<ServiceRepositorySettings>(Configuration.GetSection("ServiceRepositorySettings"));
            services.Configure<TestdataRepositorySettings>(Configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            // Configure Authentication
            // Use [Authorize] to require login on MVC Controller Actions
            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

            string hostName = string.Empty;
            if (Environment.GetEnvironmentVariable("GeneralSettings__HostName") != null)
            {
                hostName = Environment.GetEnvironmentVariable("GeneralSettings__HostName");
            }
            else
            {
                hostName = Configuration["GeneralSettings:HostName"];
            }

            services.AddControllers(options => options.EnableEndpointRouting = false);
            services.AddRazorPages();
            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = key,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        RequireExpirationTime = true,
                        ValidateLifetime = true
                    };
                    options.Cookie.Domain = hostName;
                    options.Cookie.Name = Common.Constants.General.RuntimeCookieName;
                });

            string applicationInsightTelemetryKey = GetApplicationInsightsKeyFromEnvironment();
            if (!string.IsNullOrEmpty(applicationInsightTelemetryKey))
            {
                services.AddApplicationInsightsTelemetry(applicationInsightTelemetryKey);
                services.AddApplicationInsightsKubernetesEnricher();
            }

            IMvcBuilder mvc = services.AddControllers();
            mvc.Services.Configure<MvcOptions>(options =>
            {
                // Adding custom modelbinders
                options.ModelBinderProviders.Insert(0, new AltinnCoreApiModelBinderProvider());
            });
            mvc.AddXmlSerializerFormatters();

            services.AddAuthorization(options =>
            {
                options.AddPolicy("InstanceRead", policy => policy.Requirements.Add(new InstanceAccessRequirement(ActionType.Read)));
                options.AddPolicy("InstanceWrite", policy => policy.Requirements.Add(new InstanceAccessRequirement(ActionType.Write)));
                options.AddPolicy("ServiceRead", policy => policy.Requirements.Add(new ServiceAccessRequirement(ActionType.Read)));
            });

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

            services.AddSwaggerGen(options =>
            {
                options.SwaggerDoc("v1", new OpenApiInfo
                {
                    Title = "Altinn Runtime",
                    Version = "v1"
                });

                try
                {
                    options.IncludeXmlComments(GetXmlCommentsPathForControllers());
                }
                catch (Exception e)
                {
                    Console.WriteLine($"Cannot read XML file for SWAGGER Config! {e.Message}");
                }
            });
        }

        private string GetXmlCommentsPathForControllers()
        {
            // locate the xml file being generated by .NET
            string xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.XML";
            string xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);

            return xmlPath;
        }

        /// <summary>
        /// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        /// </summary>
        /// <param name="appBuilder">The application builder</param>
        /// <param name="env">The hosting environment</param>
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

            appBuilder.UseSwagger();
            appBuilder.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "Altinn Apps Runtime API");
            });

            appBuilder.UseStatusCodePages(async context =>
            {
                var request = context.HttpContext.Request;
                var response = context.HttpContext.Response;
                string url = $"https://{request.Host.ToString()}{request.Path.ToString()}";

                // you may also check requests path to do this only for specific methods
                // && request.Path.Value.StartsWith("/specificPath")
                if (response.StatusCode == (int)HttpStatusCode.Unauthorized)
                {
                    response.Redirect($"account/login?gotoUrl={url}");
                }
            });

            appBuilder.UseStaticFiles(new StaticFileOptions()
            {
                OnPrepareResponse = (context) =>
                {
                    Microsoft.AspNetCore.Http.Headers.ResponseHeaders headers = context.Context.Response.GetTypedHeaders();
                    headers.CacheControl = new CacheControlHeaderValue()
                    {
                        Public = true,
                        MaxAge = TimeSpan.FromMinutes(60),
                    };
                },
            });

            appBuilder.UseRouting();
            appBuilder.UseAuthentication();
            appBuilder.UseAuthorization();

            appBuilder.UseEndpoints(endpoints =>
            {
                // ---------------------------- UI --------------------------- //
                endpoints.MapControllerRoute(
                    name: "profileApiRoute",
                    pattern: "{org}/{app}/api/v1/{controller}/user/",
                    defaults: new
                    {
                        action = "GetUser",
                        controller = "Profile"
                    },
                    constraints: new
                    {
                        action = "GetUser",
                        controller = "Profile",
                    });
                endpoints.MapControllerRoute(
                    name: "uiRoute",
                    pattern: "{org}/{app}/{partyId}/{instanceGuid}/{action}/{view|validation?}/{itemId?}",
                    defaults: new { controller = "Instance" },
                    constraints: new
                    {
                        action = "CompleteAndSendIn|Lookup|ModelValidation|Receipt|StartService|ViewPrint|edit",
                        controller = "Instance",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        instanceGuid = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                    });

                endpoints.MapControllerRoute(
                   name: "uiEditRoute",
                   pattern: "{org}/{app}/{instanceId?}",
                   defaults: new { action = "EditSPA", controller = "Instance" },
                   constraints: new
                   {
                       action = "EditSPA",
                       controller = "Instance",
                       app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                       instanceId = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                   });

                endpoints.MapControllerRoute(
                   name: "runtimeRoute",
                   pattern: "{org}/{app}",
                   defaults: new { action = "EditSPA", controller = "Instance" },
                   constraints: new
                   {
                       action = "EditSPA",
                       controller = "Instance",
                       app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                   });

                endpoints.MapControllerRoute(
                   name: "instantiateRoute",
                   pattern: "{org}/{app}/{controller}/InstantiateApp",
                   defaults: new { action = "InstantiateApp", controller = "Instance" },
                   constraints: new
                   {
                       action = "InstantiateApp",
                       controller = "Instance",
                       app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                   });

                endpoints.MapControllerRoute(
                   name: "authentication",
                   pattern: "{org}/{app}/{controller}/{action}/{goToUrl?}",
                   defaults: new { action = "Login", controller = "Account" },
                   constraints: new
                   {
                       action = "Login",
                       controller = "Account",
                       app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                   });

                // ---------------------------- API -------------------------- //
                endpoints.MapControllerRoute(
                    name: "resourceRoute",
                    pattern: "{org}/{app}/api/resource/{id}",
                    defaults: new { action = "Index", controller = "Resource" },
                    constraints: new
                    {
                        controller = "Resource",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                    });

                endpoints.MapControllerRoute(
                    name: "textresourceRoute",
                    pattern: "{org}/{app}/api/textresources",
                    defaults: new { action = "TextResources", controller = "Resource" },
                    constraints: new
                    {
                        controller = "Resource",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                    });

                endpoints.MapControllerRoute(
                    name: "runtimeResourceRoute",
                    pattern: "{org}/{app}/api/runtimeresources/{id}/",
                    defaults: new { action = "RuntimeResource", controller = "Resource" },
                    constraints: new
                    {
                        controller = "Resource",
                    });

                endpoints.MapControllerRoute(
                    name: "metadataRoute",
                    pattern: "{org}/{app}/api/metadata/{action=Index}",
                    defaults: new { controller = "Resource" },
                    constraints: new
                    {
                        controller = "Resource",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                    });

                endpoints.MapControllerRoute(
                    name: "apiPostRoute",
                    pattern: "{org}/{app}/api/{reportee}/{apiMode}",
                    defaults: new { action = "Index", controller = "ServiceAPI" },
                    constraints: new
                    {
                        controller = "ServiceAPI",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                    });

                endpoints.MapControllerRoute(
                    name: "apiAttachmentRoute",
                    pattern: "{org}/{app}/api/attachment/{partyId}/{instanceGuid}/{action}",
                    defaults: new { controller = "Instance" },
                    constraints: new
                    {
                        controller = "Instance",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        instanceGuid = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                    });

                endpoints.MapControllerRoute(
                    name: "apiPutRoute",
                    pattern: "{org}/{app}/api/{reportee}/{instanceId}/{apiMode}",
                    defaults: new { action = "Index", controller = "ServiceAPI" },
                    constraints: new
                    {
                        controller = "ServiceAPI",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        instanceId = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                    });
                endpoints.MapControllerRoute(
                    name: "apiWorkflowRoute",
                    pattern: "{org}/{app}/api/workflow/{partyId}/{instanceId}/{action=GetCurrentState}",
                    defaults: new { controller = "ServiceAPI" },
                    constraints: new
                    {
                        controller = "ServiceAPI",
                        partyId = "[0-9]+",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        instanceId = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                    });

                endpoints.MapControllerRoute(
                    name: "codelistRoute",
                    pattern: "{org}/{app}/api/{controller}/{action=Index}/{name}",
                    defaults: new { controller = "Codelist" },
                    constraints: new
                    {
                        controller = "Codelist",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                    });

                endpoints.MapControllerRoute(
                    name: "apiRoute",
                    pattern: "{org}/{app}/api/{partyId}/{instanceId}",
                    defaults: new { action = "Gindex", controller = "ServiceAPI" },
                    constraints: new
                    {
                        controller = "ServiceAPI",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        partyId = "[0-9]{1,20}",
                        instanceId = @"^(\{{0,1}([0-9a-fA-F]){8}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){4}-([0-9a-fA-F]){12}\}{0,1})$",
                    });

                endpoints.MapControllerRoute(
                    name: "serviceRoute",
                    pattern: "{org}/{app}/{controller}/{action=Index}/{id?}",
                    defaults: new { controller = "Service" },
                    constraints: new
                    {
                        controller = @"(Codelist|Config|Model|Rules|ServiceMetadata|Text|UI|Workflow|React)",
                        app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                        id = "[a-zA-Z0-9_\\-]{1,30}",
                    });
                endpoints.MapControllerRoute(
                    name: "languageRoute",
                    pattern: "{org}/{app}/api/{controller}/{action=Index}/{id?}",
                    defaults: new { controller = "Language" },
                    constraints: new
                    {
                        controller = "Language",
                    });

                endpoints.MapControllerRoute(
                  name: "authorization",
                  pattern: "{org}/{app}/api/{controller}/parties/{partyId}/validate",
                  defaults: new { action = "ValidateSelectedParty", controller = "Authorization" },
                  constraints: new
                  {
                      action = "ValidateSelectedParty",
                      controller = "Authorization",
                      app = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
                  });

                /* endpoints.MapControllerRoute(
                     name: "authenticationRoute",
                     pattern: "{controller}/{action}/{gotourl?}",
                     defaults: new { controller = "Account" },
                     constraints: new
                     {
                         controller = "Account",
                     }); */

                // -------------------------- DEFAULT ------------------------- //
                endpoints.MapControllerRoute(
                     name: "defaultRoute2",
                     pattern: "{controller}/{action=Index}/{id?}");

                endpoints.MapControllerRoute(
                    name: "defaultRoute",
                    pattern: "{action=Index}/{id?}");
            });

            // appBuilder.UseHsts();
            // appBuilder.UseHttpsRedirection();

            appBuilder.UseResponseCompression();
            appBuilder.UseRequestLocalization();
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
