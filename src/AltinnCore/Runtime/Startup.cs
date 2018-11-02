﻿using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using AltinnCore.Runtime.Authorization;
using AltinnCore.Common.Backend;
using AltinnCore.Common.Configuration;
using AltinnCore.Runtime.ModelBinding;
using AltinnCore.Common.Enums;
using AltinnCore.Common.Services.Implementation;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Razor;
using Microsoft.AspNetCore.Mvc.Razor.Internal;
using Microsoft.AspNetCore.Mvc.Razor.Compilation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace AltinnCore.Runtime
{
	public class Startup
	{

		public IConfiguration Configuration { get; }

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
				services.AddSingleton<IExecution, ExecutionSILocalDev>();
			}
			else
			{
				services.AddSingleton<IExecution, ExecutionSIContainer>();
			}

			services.AddSingleton<IArchive, ArchiveSILocalDev>();
			services.AddSingleton<IAuthorization, AuthorizationSILocalDev>();
			services.AddSingleton<IAuthorizationHandler, InstanceAccessHandler>();
			services.AddSingleton<IAuthorizationHandler, ServiceAccessHandler>();
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
			services.AddSingleton<ITestdata, TestdataSILocalDev>();
			services.AddSingleton<ITestingRepository, TestingRepository>();
			services.AddSingleton<IGitea, GiteaAPIWrapper>();
			services.AddSingleton<ISourceControl, SourceControlSI>();
			services.AddSingleton(Configuration);
			services.TryAddSingleton<IHttpContextAccessor, HttpContextAccessor>();

			services.AddResponseCompression();

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
					options.AccessDeniedPath = "/runtime/ManualTesting/NotAuthorized/";
					options.LoginPath = "/runtime/ManualTesting/Users/";
					options.Cookie.Name = "RuntimeCookie";
					options.Events = new CookieAuthenticationEvents
					{
						// Add Custom Event handler to be able to redirect users for authentication upgrade
						OnRedirectToAccessDenied = NotAuthorizedHandler.RedirectToNotAuthorized
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
					var supportedCultures = new List<CultureInfo>
						{
                            // The current supported languages. Can easily be added more. 
                            new CultureInfo("en-US"),
							new CultureInfo("nb-NO"),
							new CultureInfo("nn-NO")
						};

					options.DefaultRequestCulture = new RequestCulture(culture: "nb-NO", uiCulture: "nb-NO");
					options.SupportedCultures = supportedCultures;
					options.SupportedUICultures = supportedCultures;
				});
		}


		// This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
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

			//app.UseHsts();
			//app.UseHttpsRedirection();
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
						MaxAge = TimeSpan.FromMinutes(60)
					};
				}
			});

			app.UseMvc(routes =>
			{
		  // ---------------------------- UI --------------------------- //
		  routes.MapRoute(
			  name: "uiRoute",
			  template: "runtime/{org}/{service}/{instanceId}/{action}/{view|validation?}/{itemId?}",
			  defaults: new { controller = "Instance" },
			  constraints: new
				  {
					  action = "CompleteAndSendIn|Lookup|ModelValidation|Receipt|StartService|ViewPrint|edit",
					  controller = "Instance",
					  service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
					  instanceId = @"\d+"
				  });

				routes.MapRoute(
				   name: "uiEditRoute",
				   template: "runtime/{org}/{service}/{instanceId}",
				   defaults: new { action = "EditSPA", controller = "Instance" },
				   constraints: new
					   {
						   action = "EditSPA",
						   controller = "Instance",
						   service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
						   instanceId = @"\d+"
					   });

		  // ---------------------------- API -------------------------- //
		  routes.MapRoute(
			  name: "resourceRoute",
			  template: "runtime/api/resource/{org}/{service}/{id}",
			  defaults: new { action = "Index", controller = "Resource" },
			  constraints: new
				  {
					  controller = "Resource",
					  service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
				  });



				routes.MapRoute(
		  name: "textresourceRoute",
		  template: "runtime/api/textresources/{org}/{service}",
		  defaults: new { action = "TextResources", controller = "Resource" },
		  constraints: new
			  {
				  controller = "Resource",
				  service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
			  });

				routes.MapRoute(
		  name: "metadataRoute",
		  template: "runtime/api/metadata/{org}/{service}/{action=Index}",
		  defaults: new { controller = "Resource" },
		  constraints: new
			  {
				  controller = "Resource",
				  service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
			  });

				routes.MapRoute(
				name: "apiPostRoute",
				template: "runtime/api/{reportee}/{org}/{service}/{apiMode}",
				defaults: new { action = "Index", controller = "ServiceAPI" },
				constraints: new
					{
						controller = "ServiceAPI",
						service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
					});

				routes.MapRoute(
				 name: "apiPutRoute",
				 template: "runtime/api/{reportee}/{org}/{service}/{instanceId}/{apiMode}",
				 defaults: new { action = "Index", controller = "ServiceAPI" },
				 constraints: new
					 {
						 controller = "ServiceAPI",
						 service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
						 instanceId = @"\d+"
					 });


				routes.MapRoute(
		   name: "codelistRoute",
		   template: "runtime/api/{controller}/{org}/{service}/{action=Index}/{name}",
		   defaults: new { controller = "Codelist" },
		   constraints: new
			   {
				   controller = "Codelist",
				   service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
			   });

				routes.MapRoute(
				name: "apiRoute",
				template: "runtime/api/{reportee}/{org}/{service}/{action=Index}/{instanceId?}",
				defaults: new { controller = "ServiceAPI" },
				constraints: new
					{
						controller = "ServiceAPI",
						service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
					});

				routes.MapRoute(
			name: "serviceRoute",
			template: "runtime/{org}/{service}/{controller}/{action=Index}/{id?}",
			defaults: new { controller = "Service" },
			constraints: new
				{
					controller = @"(Codelist|Config|DataSource|ManualTesting|Model|Rules|ServiceMetadata|Testing|Text|UI|Workflow|React)",
					service = "[a-zA-Z][a-zA-Z0-9_\\-]{2,30}",
					id = "[a-zA-Z0-9_\\-]{1,30}"
				});


		  // -------------------------- DEFAULT ------------------------- //
		  routes.MapRoute(
				   name: "defaultRoute2",
				   template: "runtime/{controller}/{action=Index}/{id?}",
				   defaults: new { controller = "ServiceCatalogue" });

				routes.MapRoute(
			  name: "defaultRoute",
			  template: "runtime/{action=Index}/{id?}",
			  defaults: new { controller = "ServiceCatalogue" });
			});
		}
	}
}
