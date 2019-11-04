using System;
using System.IO;
using System.Security.Cryptography.X509Certificates;
using Altinn.App.Api.Controllers;
using Altinn.App.AppLogic;
using Altinn.App.Common.Interface;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Configuration;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Altinn.App.Services.Interfaces;
using AltinnCore.Authentication.JwtCookie;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;

namespace Altinn.App
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
            services.AddControllers().AddApplicationPart(typeof(InstancesController).Assembly);
            services.AddTransient<IAltinnApp, AltinnApp>();
            services.AddSingleton<IExecution, ExecutionAppSI>();
            services.AddSingleton<IDSF, RegisterDSFAppSI>();
            services.AddSingleton<IER, RegisterERAppSI>();
            services.AddSingleton<IRegister, RegisterAppSI>();
            services.AddSingleton<IProfile, ProfileAppSI>();
            services.AddSingleton<IInstance, InstanceAppSI>();
            services.AddSingleton<IData, DataAppSI>();
            services.AddSingleton<IProcess, ProcessAppSI>();
            services.AddSingleton<IInstanceEvent, InstanceEventAppSI>();
            services.AddSingleton<IAuthorization, AuthorizationAppSI>();
            services.AddSingleton<IApplication, ApplicationAppSI>();
            services.AddSingleton<IWorkflow, WorkflowAppSI>();
            services.AddSingleton<IRepository, RepositorySI>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<IHttpClientAccessor, HttpClientAccessor>();
            services.AddSingleton<IPlatformServices, PlatformStudioSI>();
            services.AddSingleton<IAuthentication, AuthenticationAppSI>();
            services.AddSingleton<IReiseApi, ReiseApi>();

            services.Configure<ServiceRepositorySettings>(Configuration.GetSection("ServiceRepositorySettings"));
            services.Configure<TestdataRepositorySettings>(Configuration.GetSection("TestdataRepositorySettings"));
            services.Configure<GeneralSettings>(Configuration.GetSection("GeneralSettings"));
            services.Configure<PlatformSettings>(Configuration.GetSection("PlatformSettings"));


            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(Startup).Assembly.CodeBase).LocalPath);

            string certPath = Path.Combine(unitTestFolder, @"..\..\..\JWTValidationCert.cer");

            X509Certificate2 cert = new X509Certificate2(certPath);
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
                        ValidateLifetime = true
                    };
                    options.Cookie.Domain = "altinn.no";
                    options.Cookie.Name = "asdfs";
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
