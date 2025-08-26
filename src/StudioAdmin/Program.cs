using Altinn.Studio.Admin.Configuration;
using Altinn.Studio.Admin.Services;
using Altinn.Studio.Admin.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Load user secrets only in development
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddUserSecrets<Program>();
}

// TODO: Add AltinnTestTools settings from keyvault in staging / prod.

builder.Services.Configure<TestToolsTokenGeneratorSettings>(
    builder.Configuration.GetSection("TestToolsTokenGenerator")
);
builder.Services.Configure<GeneralSettings>(builder.Configuration.GetSection("GeneralSettings"));

// Add services to the container.
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ICdnConfigService, CdnConfigService>();
builder.Services.AddHttpClient<TestToolsTokenGeneratorService>();
builder.Services.AddHttpClient<IStorageService, TestStorageService>();
builder.Services.AddHttpClient<IApplicationsService, ApplicationsService>();
builder.Services.AddHttpClient<IKubernetesWrapperService, KubernetesWrapperService>();
builder.Services.AddHttpClient<IAppResourcesService, AppResourcesService>();
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
