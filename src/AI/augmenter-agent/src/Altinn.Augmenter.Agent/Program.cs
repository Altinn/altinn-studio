using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Pipelines.Checklist;
using Altinn.Augmenter.Agent.Pipelines.Decision;
using Altinn.Augmenter.Agent.Pipelines.RequestInfo;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Services.Agent;
using Microsoft.AspNetCore.Http.Features;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<CallbackOptions>(builder.Configuration.GetSection(CallbackOptions.SectionName));
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection(UploadOptions.SectionName));
builder.Services.Configure<PdfGenerationOptions>(builder.Configuration.GetSection(PdfGenerationOptions.SectionName));
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.SectionName));

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
builder.Services.AddScoped<PipelineContext>();
builder.Services.AddScoped<IAgentService, ClaudeCliAgentService>();
builder.Services.AddScoped<IPdfGeneratorService, PdfGeneratorService>();
builder.Services.AddSingleton<IRequestInfoDataMapper, RequestInfoDataMapper>();
builder.Services.AddSingleton<IChecklistDataMapper, ChecklistDataMapper>();
builder.Services.AddSingleton<IDecisionDataMapper, DecisionDataMapper>();
builder.Services.AddScoped<IMultipartParserService, MultipartParserService>();
var callbackOptions = builder.Configuration.GetSection(CallbackOptions.SectionName).Get<CallbackOptions>() ?? new CallbackOptions();
builder.Services.AddHttpClient<ICallbackService, CallbackService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(callbackOptions.TimeoutSeconds);
});

// PDF generation pipeline steps (order matters — checklist must run before decision)
builder.Services.AddScoped<IPdfGenerationStep, RequestInfoGenerationStep>();
builder.Services.AddScoped<IPdfGenerationStep, ChecklistAgentStep>();
builder.Services.AddScoped<IPdfGenerationStep, DecisionAgentStep>();

// Pipeline orchestrator
builder.Services.AddScoped<IPdfPipeline, PdfPipeline>();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapAgentTestEndpoints();
app.MapGenerateEndpoints();
app.MapGenerateAsyncEndpoints();

app.Run();

public partial class Program;
