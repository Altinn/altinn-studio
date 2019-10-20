using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.AppLogic;
using Altinn.App.Common.Interface;
using Altinn.App.Controllers;
using Altinn.App.Services.Clients;
using Altinn.App.Services.Implementation;
using Altinn.App.Services.Interface;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

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
            services.AddSingleton<ITestdata, TestdataAppSI>();
            services.AddSingleton<IInstanceEvent, InstanceEventAppSI>();
            services.AddSingleton<IAuthorization, AuthorizationAppSI>();
            services.AddSingleton<IApplication, ApplicationAppSI>();
            services.AddSingleton<IWorkflow, WorkflowAppSI>();
            services.AddSingleton<IRepository, RepositorySI>();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddSingleton<IHttpClientAccessor, HttpClientAccessor>();
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }

            app.UseRouting();

            app.UseAuthorization();

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });
        }
    }
}
