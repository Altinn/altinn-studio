using System;
using System.Security.Cryptography.X509Certificates;

using AltinnCore.Authentication.JwtCookie;
using AltinnCore.Authentication.Constants;
using Altinn.Authorization.ABAC.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Interfaces;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Clients;
using Altinn.Platform.Authorization.Services.Implementation;
using Altinn.Platform.Authorization.Services.Interface;
using Altinn.Platform.Authorization.Repositories;
using Altinn.Platform.Authorization.Repositories.Interface;
using Altinn.Platform.Authorization.ModelBinding;
using Altinn.Platform.Events.Repository;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Helpers;

using LocalTest.Configuration;
using LocalTest.Services.Authentication.Interface;
using LocalTest.Services.Authentication.Implementation;
using LocalTest.Services.Authorization.Implementation;
using LocalTest.Services.Events.Implementation;
using LocalTest.Services.LocalApp.Implementation;
using LocalTest.Services.LocalApp.Interface;
using LocalTest.Services.Profile.Interface;
using LocalTest.Services.Profile.Implementation;
using LocalTest.Services.Register.Interface;
using LocalTest.Services.Register.Implementation;
using LocalTest.Services.Storage.Implementation;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.IdentityModel.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using LocalTest.Services.Localtest.Interface;
using LocalTest.Services.Localtest.Implementation;
using System.Text.Json.Serialization;
using LocalTest.Services.Authorization.Interface;

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
            services.AddControllers().AddJsonOptions(opt =>
            {
                opt.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
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
            services.AddSingleton<ILocalTestAppSelection, LocalTestAppSelectionSI>();
            services.AddSingleton<IUserProfiles, UserProfilesWrapper>();
            services.AddSingleton<IOrganizations, OrganizationsWrapper>();
            services.AddSingleton<Services.Register.Interface.IParties, PartiesWrapper>();
            services.AddSingleton<IPersons, PersonsWrapper>();
            services.AddSingleton<Altinn.Platform.Authorization.Services.Interface.IParties, PartiesService>();
            services.AddSingleton<IInstanceRepository, InstanceRepository>();
            services.AddSingleton<IDataRepository, DataRepository>();
            services.AddSingleton<IInstanceEventRepository, InstanceEventRepository>();
            services.AddSingleton<IEventsRepository, EventsRepository>();
            services.AddSingleton<IApplicationRepository, ApplicationRepository>();
            services.AddSingleton<ITextRepository, TextRepository>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddHttpClient<AuthorizationApiClient>();
            services.AddSingleton<IPDP, PDPAppSI>();
            services.AddSingleton<IAuthentication, AuthenticationService>();
            services.AddTransient<IAuthorizationHandler, AppAccessHandler>();
            services.AddTransient<IAuthorizationHandler, ScopeAccessHandler>();

            services.AddSingleton<IContextHandler, ContextHandler>();
            services.AddSingleton<IPolicyRetrievalPoint, PolicyRetrievalPoint>();
            services.AddSingleton<IPolicyInformationRepository, PolicyInformationRepository>();
            services.AddSingleton<IRoles, RolesWrapper>();
            services.AddSingleton<IPartiesWithInstancesClient, PartiesWithInstancesClient>();

            X509Certificate2 cert = new X509Certificate2("JWTValidationCert.cer");
            SecurityKey key = new X509SecurityKey(cert);

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
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero
                    };
                });

            services.AddAuthorization(options =>
            {
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_READ, policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_WRITE, policy => policy.Requirements.Add(new AppAccessRequirement("write")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_DELETE, policy => policy.Requirements.Add(new AppAccessRequirement("delete")));
                options.AddPolicy(AuthzConstants.POLICY_INSTANCE_COMPLETE, policy => policy.Requirements.Add(new AppAccessRequirement("complete")));
                options.AddPolicy(AuthzConstants.POLICY_SCOPE_APPDEPLOY, policy => policy.Requirements.Add(new ScopeAccessRequirement("altinn:appdeploy")));
                options.AddPolicy(AuthzConstants.POLICY_SCOPE_INSTANCE_READ, policy => policy.Requirements.Add(new ScopeAccessRequirement("altinn:instances.read")));
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
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(
            IApplicationBuilder app,
            IWebHostEnvironment env,
            IOptions<LocalPlatformSettings> localPlatformSettings)
        {
            if (env.IsDevelopment())
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
            
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new PhysicalFileProvider(localPlatformSettings.Value.LocalTestingStorageBasePath),
                RequestPath = "/LocalPlatformStorage",
                ServeUnknownFileTypes = true,
            });

            app.UseDirectoryBrowser(new DirectoryBrowserOptions
            {
                FileProvider = new PhysicalFileProvider(localPlatformSettings.Value.LocalTestingStorageBasePath),
                RequestPath = "/LocalPlatformStorage"
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
