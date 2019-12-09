using System;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using Altinn.App.Api.Controllers;
using Altinn.App.AppLogic.Validation;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Implementation;
using Altinn.Common.PEP.Interfaces;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App
{
    public class Startup
    {
        private readonly IWebHostEnvironment _env;

        public Startup(IConfiguration configuration, IWebHostEnvironment env)
        {
            Configuration = configuration;
            _env = env;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            // Add API controllers from Altinn.App.Api
            services.AddControllersWithViews().AddApplicationPart(typeof(InstancesController).Assembly);

            // Dot net services
            services.AddSingleton<IAuthorizationHandler, AppAccessHandler>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

            // Internal Application services
            services.AddTransient<IApplication, ApplicationAppSI>();
            services.AddTransient<IAppResources, AppResourcesSI>();
            services.AddTransient<IProcess, ProcessAppSI>();
            services.AddTransient<IHttpClientAccessor, HttpClientAccessor>();
            services.AddTransient<Altinn.Common.PEP.Clients.IHttpClientAccessor, Altinn.Common.PEP.Clients.HttpClientAccessor>();

            // Services for Altinn Platform components
            services.AddTransient<IAuthentication, AuthenticationAppSI>();
            services.AddTransient<IAuthorization, AuthorizationAppSI>();
            services.AddTransient<IData, DataAppSI>();
            services.AddTransient<IDSF, RegisterDSFAppSI>();
            services.AddTransient<IER, RegisterERAppSI>();
            services.AddTransient<IInstance, InstanceAppSI>();
            services.AddTransient<IInstanceEvent, InstanceEventAppSI>();
            services.AddTransient<IProfile, ProfileAppSI>();
            services.AddTransient<IRegister, RegisterAppSI>();
            services.AddTransient<IPDP, PDPAppSI>();
            services.AddSingleton<IValidation, ValidationAppSI>();

            // Altinn App implementation service (The concrete implementation of logic from Application repsitory)
            services.AddTransient<IAltinnApp, AppLogic.App>();
            services.AddTransient<IValidationHandler, ValidationHandler>();

            services.Configure<KestrelServerOptions>(options =>
            {
                options.AllowSynchronousIO = true;
            });

            // Application Settings
            services.Configure<AppSettings>(Configuration.GetSection("AppSettings"));
            services.Configure<TestdataRepositorySettings>(Configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PepSettings>(Configuration.GetSection("PEPSettings"));
            services.Configure<Altinn.Common.PEP.Configuration.PlatformSettings>(Configuration.GetSection("PlatformSettings"));

            AppSettings appSettings = Configuration.GetSection("AppSettings").Get<AppSettings>();

            services.AddAuthentication(JwtCookieDefaults.AuthenticationScheme)
                .AddJwtCookie(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        RequireExpirationTime = true,
                        ValidateLifetime = true
                    };
                    options.Cookie.Domain = Configuration["GeneralSettings:HostName"];
                    options.Cookie.Name = Services.Constants.General.RuntimeCookieName;
                    options.MetadataAddress = Configuration["AppSettings:OpenIdWellKnownEndpoint"];
                    if (_env.IsDevelopment())
                    {
                        options.RequireHttpsMetadata = false;
                    }
                });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("InstanceRead", policy => policy.Requirements.Add(new AppAccessRequirement("read")));
                options.AddPolicy("InstanceWrite", policy => policy.Requirements.Add(new AppAccessRequirement("write")));
                options.AddPolicy("InstanceInstantiate", policy => policy.Requirements.Add(new AppAccessRequirement("instantiate")));
            });
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
