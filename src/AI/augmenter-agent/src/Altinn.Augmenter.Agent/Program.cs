using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Services;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<CallbackOptions>(builder.Configuration.GetSection(CallbackOptions.SectionName));
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection(UploadOptions.SectionName));
builder.Services.Configure<PdfGenerationOptions>(builder.Configuration.GetSection(PdfGenerationOptions.SectionName));

var uploadOptions = builder.Configuration.GetSection(UploadOptions.SectionName).Get<UploadOptions>() ?? new UploadOptions();
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = uploadOptions.MaxTotalBytes;
});

// URL validation
builder.Services.AddSingleton<ICallbackUrlValidator, CallbackUrlValidator>();

// Background job queue
builder.Services.AddSingleton<PdfGenerationQueue>();
builder.Services.AddSingleton<IPdfGenerationQueue>(sp => sp.GetRequiredService<PdfGenerationQueue>());
builder.Services.AddHostedService<PdfGenerationBackgroundService>();

// Services
builder.Services.AddScoped<IPdfGeneratorService, PdfGeneratorService>();
builder.Services.AddScoped<IMultipartParserService, MultipartParserService>();
builder.Services.AddHttpClient<ICallbackService, CallbackService>();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapGenerateEndpoints();
app.MapGenerateAsyncEndpoints();

app.Run();

public partial class Program;
