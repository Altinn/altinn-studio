using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;

using Altinn.Authorization.ABAC.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Clients;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Events.Services;
using Altinn.Platform.Events.Services.Interfaces;
using Altinn.Platform.Register.Core;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using Altinn.ResourceRegistry.Core;

using AltinnCore.Authentication.Constants;
using AltinnCore.Authentication.JwtCookie;
using LocalTest.Clients.CdnAltinnOrgs;
using LocalTest.Configuration;
using LocalTest.Filters;
using LocalTest.Helpers;
using LocalTest.Notifications.LocalTestNotifications;
using LocalTest.Services.AccessManagement;
using LocalTest.Services.Authentication.Implementation;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Authorization.Implementation;
using LocalTest.Services.Authorization.Interface;
using LocalTest.Services.Events.Implementation;
using LocalTest.Services.LocalApp.Implementation;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.LocalFrontend;
using LocalTest.Services.LocalFrontend.Interface;
using LocalTest.Services.Profile.Implementation;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.Register.Implementation;
using LocalTest.Services.Register.Interface;
using LocalTest.Services.Storage.Implementation;
using LocalTest.Services.TestData;

using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Logging;
using Microsoft.IdentityModel.Tokens;

using ResourceRegistryTest.Mocks;

namespace LocalTest
{
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddAutoMapper(typeof(Program));

            services.AddControllers().AddJsonOptions(opt =>
            {
                opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                opt.JsonSerializerOptions.WriteIndented = true;
            });

            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(Configuration.GetSection("PepSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            services.Configure<LocalPlatformSettings>(Configuration.GetSection("LocalPlatformSettings"));
            services.AddControllersWithViews();
            services.AddSingleton(Configuration);
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<Altinn.Platform.Authentication.Configuration.GeneralSettings>(Configuration.GetSection("AuthnGeneralSettings"));
            services.Configure<CertificateSettings>(Configuration);
            services.Configure<CertificateSettings>(Configuration.GetSection("CertificateSettings"));
            services.Configure<PersonLookupSettings>(Configuration.GetSection("PersonLookupSettings"));
            services.AddSingleton<IUserProfiles, UserProfilesWrapper>();
            services.AddSingleton<IOrganizations, OrganizationsWrapper>();
            services.AddSingleton<Services.Register.Interface.IParties, PartiesWrapper>();
            services.AddSingleton<IPersons, PersonsWrapper>();
            services.AddSingleton<Altinn.Platform.Authorization.Services.Interface.IParties, PartiesService>();
            services.AddSingleton<IClaims, ClaimsService>();
            services.AddSingleton<IInstanceRepository, InstanceRepository>();
            services.AddSingleton<IInstanceAndEventsRepository, InstanceAndEventsRepository>();
            services.AddSingleton<IDataRepository, DataRepository>();
            services.AddSingleton<IInstanceEventRepository, InstanceEventRepository>();
            services.AddSingleton<IEventsRepository, EventsRepository>();
            services.AddTransient<ISubscriptionService, SubscriptionService>();
            services.AddSingleton<IApplicationRepository, ApplicationRepository>();
            services.AddSingleton<ITextRepository, TextRepository>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddHttpClient<AuthorizationApiClient>();
            services.AddHttpClient<AltinnOrgsClient>();
            services.AddSingleton<IPDP, PDPAppSI>();
            services.AddTransient<IPersonLookup, PersonLookupService>();
            services.AddTransient<TestDataService>();
            services.AddTransient<TenorDataRepository>();

            services.AddSingleton<IContextHandler, ContextHandler>();
            services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
            services.AddSingleton<IPolicyInformationRepository, PolicyInformationRepository>();
            services.AddSingleton<IRoles, RolesWrapper>();
            services.AddSingleton<IPartiesWithInstancesClient, PartiesWithInstancesClient>();
            services.AddSingleton<IPolicyRepository, PolicyRepositoryMock>();
            services.AddSingleton<IResourceRegistry, ResourceRegistryService>();
            services.AddSingleton<IResourceRegistryRepository, RegisterResourceRepositoryMock>();
            services.AddSingleton<LocalInstanceDelegationsRepository>();

            // Shared auth services
            services.AddSingleton<IAuthentication, AuthenticationService>();
            services.AddTransient<IAuthorizationHandler, AppAccessHandler>();
            services.AddTransient<IAuthorizationHandler, ScopeAccessHandler>();
            services.AddTransient<IAuthorizationHandler, StorageAccessHandler>();
            services.AddTransient<IAuthorizationHandler, ClaimAccessHandler>();

            // Notifications services
            
            GeneralSettings generalSettings = Configuration.GetSection("GeneralSettings").Get<GeneralSettings>();
            services.AddNotificationServices(generalSettings.BaseUrl, Configuration);
            
            // Storage services
            services.AddSingleton<IClaimsPrincipalProvider, ClaimsPrincipalProvider>();
            services.AddTransient<IAuthorization, AuthorizationService>();
            services.AddTransient<IDataService, DataService>();
            services.AddTransient<IInstanceService, InstanceService>();
            services.AddTransient<IInstanceEventService, InstanceEventService>();
            services.AddSingleton<IApplicationService, ApplicationService>();
            services.AddMemoryCache();

            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        RequireExpirationTime = true,
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero
                    };
                    options.JwtCookieName = "AltinnStudioRuntime";
                    options.MetadataAddress = new Uri($"http://localhost:5101/authentication/api/v1/openid").ToString();;
                    options.RequireHttpsMetadata = false;
                });

            services.AddAuthorization(options =>
            {
                options.AddPolicy(
                    AuthzConstants.POLICY_INSTANCE_READ,
                    policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy(
                    AuthzConstants.POLICY_INSTANCE_WRITE,
                    policy => policy.Requirements.Add(new AppAccessRequirement("write")));
                options.AddPolicy(
                    AuthzConstants.POLICY_INSTANCE_DELETE,
                    policy => policy.Requirements.Add(new AppAccessRequirement("delete")));
                options.AddPolicy(
                    AuthzConstants.POLICY_INSTANCE_COMPLETE,
                    policy => policy.Requirements.Add(new AppAccessRequirement("complete")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_SIGN,
                    policy => policy.Requirements.Add(new AppAccessRequirement("sign")));

                options.AddPolicy(
                    AuthzConstants.POLICY_SCOPE_APPDEPLOY,
                    policy => policy.Requirements.Add(new ScopeAccessRequirement("altinn:appdeploy")));
                options.AddPolicy(
                    AuthzConstants.POLICY_SCOPE_INSTANCE_READ,
                    policy => policy.Requirements.Add(new ScopeAccessRequirement("altinn:instances.read")));

                options.AddPolicy(
                    "AuthorizationLevel2",
                    policy => policy.RequireClaim(AltinnCoreClaimTypes.AuthenticationLevel, "2", "3", "4"));
            });

            services.AddMvc(options =>
            {
                // Adding custom model binders
                options.ModelBinderProviders.Insert(0, new XacmlRequestApiModelBinderProvider());
            });

            services.AddDirectoryBrowser();

            // Access local app details depending on LocalAppMode ("file" or "http")
            if ("http".Equals(Configuration["LocalPlatformSettings:LocalAppMode"], StringComparison.InvariantCultureIgnoreCase))
            {
                services.AddTransient<ILocalApp, LocalAppHttp>();
            }
            else
            {
                services.AddTransient<ILocalApp, LocalAppFile>();
            }

            services.AddTransient<ILocalFrontendService, LocalFrontendService>();

            services.AddHttpForwarder();

            services.AddHealthChecks();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(
            IApplicationBuilder app,
            IWebHostEnvironment env,
            IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            if (env.IsDevelopment() || env.IsEnvironment("docker") || env.IsEnvironment("podman"))
            {
                app.UseDeveloperExceptionPage();

                // Enable higher level of detail in exceptions related to JWT validation
                IdentityModelEventSource.ShowPII = true;
            }
            else
            {
                app.UseExceptionHandler("/Home/Error");
                // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
                app.UseHsts();
            }

            app.UseHealthChecks("/health");
            app.UseMiddleware<ProxyMiddleware>();
            
            var storagePath = new DirectoryInfo(localPlatformSettings.Value.LocalTestingStorageBasePath);
            if (!storagePath.Exists)
                storagePath.Create();
            
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(storagePath.FullName),
                RequestPath = "/LocalPlatformStorage",
                ServeUnknownFileTypes = true,
            });

            app.UseDirectoryBrowser(new DirectoryBrowserOptions
            {
                FileProvider = new PhysicalFileProvider(storagePath.FullName),
                RequestPath = "/LocalPlatformStorage",
                Formatter = new SortedHtmlDirectoryFormatter(),
            });
            app.UseStaticFiles();

            app.UseRouting();

            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=Home}/{action=Index}/{id?}");
            });
        }
    }
}
