using System.Net.Http.Headers;
using Altinn.Studio.Admin.Configuration;
using Altinn.Studio.Admin.Providers.Interfaces;
using Altinn.Studio.Admin.Services;
using Altinn.Studio.Admin.Services.Interfaces;
using Azure.Core;
using Azure.Identity;
using Azure.Monitor.Query;

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
builder.Services.AddSingleton(new LogsQueryClient(new DefaultAzureCredential()));
builder.Services.AddSingleton<IPrometheusClientService>(sp => sp.GetRequiredService<PrometheusClientService>());
builder.Services.AddHttpClient<PrometheusClientService>(async c =>
{
    c.BaseAddress = new Uri("https://ttd-tt02-amw-b5hbcgf2h0eybwae.norwayeast.prometheus.monitor.azure.com"); // Environment.GetEnvironmentVariable("PROM_URL")
    c.Timeout = TimeSpan.FromSeconds(8);

    var credential = new DefaultAzureCredential();
    var token = await credential.GetTokenAsync(
        new TokenRequestContext(new[] { "https://prometheus.monitor.azure.com/.default" }),
        CancellationToken.None);

    c.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
});

// Add services to the container.
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ICdnConfigService, CdnConfigService>();
builder.Services.AddHttpClient<TestToolsTokenGeneratorService>();
builder.Services.AddHttpClient<IStorageService, TestStorageService>();
builder.Services.AddHttpClient<IApplicationsService, ApplicationsService>();
builder.Services.AddTransient<IAzureMonitorClientService, AzureMonitorClientService>();
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
