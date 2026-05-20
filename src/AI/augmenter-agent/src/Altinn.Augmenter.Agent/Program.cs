using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Pipelines.Checklist;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Pipelines.RequestInfo;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Services.Agent;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using Altinn.Augmenter.Agent.Services.Domain;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Configuration
builder.Services.Configure<CallbackOptions>(builder.Configuration.GetSection(CallbackOptions.SectionName));
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection(UploadOptions.SectionName));
builder.Services.Configure<PdfGenerationOptions>(builder.Configuration.GetSection(PdfGenerationOptions.SectionName));
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.SectionName));
builder.Services.Configure<ContentPathsOptions>(builder.Configuration.GetSection(ContentPathsOptions.SectionName));
builder.Services.AddSingleton<IPostConfigureOptions<ContentPathsOptions>, ContentPathsPostConfigure>();

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
builder.Services.AddHttpClient(SandkasseHttpAgentService.HttpClientName);
builder.Services.AddScoped<IAgentService>(sp =>
{
    var opts = sp.GetRequiredService<IOptions<AgentOptions>>().Value;
    return opts.Provider switch
    {
        "sandkasse-http" => ActivatorUtilities.CreateInstance<SandkasseHttpAgentService>(sp),
        "claude-cli"     => ActivatorUtilities.CreateInstance<ClaudeCliAgentService>(sp),
        _ => throw new InvalidOperationException(
            $"Unknown Agent:Provider '{opts.Provider}'. Supported: sandkasse-http, claude-cli."),
    };
});
// Per-punkt orchestrator + supporting services (used by agent-pdf-orchestrated step)
foreach (var tool in ToolRegistry.BuiltIn())
    builder.Services.AddSingleton(tool);
builder.Services.AddSingleton<IToolDefinitionLoader, FileToolDefinitionLoader>();
builder.Services.AddSingleton<IToolRegistry>(sp => new ToolRegistry(
    sp.GetServices<ITool>(),
    sp.GetRequiredService<IToolDefinitionLoader>()));
builder.Services.AddSingleton<IRulesLoader, MarkdownRulesLoader>();
builder.Services.AddSingleton<ISystemPromptProvider, FileSystemPromptProvider>();
builder.Services.AddScoped<IChatService, SandkasseChatService>();
builder.Services.AddScoped<IChecklistOrchestrator, ChecklistOrchestrator>();

builder.Services.AddScoped<IPdfGeneratorService, PdfGeneratorService>();
builder.Services.AddScoped<IDocxGeneratorService, DocxGeneratorService>();
builder.Services.AddScoped<IMultipartParserService, MultipartParserService>();

// Domain reference data loaded from /etc/augmenter/domain/
builder.Services.AddSingleton<DomainDataProvider>();

// Keyed mappers — referenced by name from pipeline.yaml
builder.Services.AddKeyedSingleton<IDataMapper, RequestInfoDataMapper>("request-info");
builder.Services.AddKeyedSingleton<IDataMapper, ChecklistDataMapper>("checklist");

// Keyed prompt builders and response parsers
builder.Services.AddKeyedSingleton<IPromptBuilder, DefaultPromptBuilder>("default");
builder.Services.AddKeyedSingleton<IResponseParser, DefaultResponseParser>("default");

var callbackOptions = builder.Configuration.GetSection(CallbackOptions.SectionName).Get<CallbackOptions>() ?? new CallbackOptions();
builder.Services.AddHttpClient<ICallbackService, CallbackService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(callbackOptions.TimeoutSeconds);
});

// Pipeline machinery — steps are built from pipeline.yaml at request time
builder.Services.AddSingleton<PipelineLoader>();
builder.Services.AddScoped<StepFactory>();
builder.Services.AddScoped<IPdfPipeline>(sp =>
{
    var loader = sp.GetRequiredService<PipelineLoader>();
    var factory = sp.GetRequiredService<StepFactory>();
    var definition = loader.Load();
    var steps = definition.Steps.Select(factory.Create).ToList();
    return new PdfPipeline(steps, sp.GetRequiredService<ILogger<PdfPipeline>>());
});

var app = builder.Build();

app.MapHealthEndpoints();
app.MapAgentTestEndpoints();
app.MapGenerateEndpoints();
app.MapGenerateAsyncEndpoints();
app.MapExperimentEndpoints();

app.Run();

public partial class Program;
