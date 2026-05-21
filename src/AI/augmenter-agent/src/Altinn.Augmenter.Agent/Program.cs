using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Pipelines.Generic.Mapping;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using Altinn.Augmenter.Agent.Services.Registries;
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

// Per-step infrastructure
builder.Services.AddScoped<PipelineContext>();

// OpenAI-compatible chat gateway used by the per-item orchestrator.
builder.Services.AddHttpClient(SandkasseChatService.HttpClientName);

// Per-item evaluation orchestrator + dependencies (the agent-pdf-orchestrated step).
// Tools registered as types so DI injects dependencies (LookupTool needs RegistryProvider).
builder.Services.AddSingleton<ITool, AgeFromIdTool>();
builder.Services.AddSingleton<ITool, DaysBetweenTool>();
builder.Services.AddSingleton<ITool, TimeWithinWindowTool>();
builder.Services.AddSingleton<ITool, LookupTool>();
builder.Services.AddSingleton<ITool, PathValueTool>();
builder.Services.AddSingleton<ITool, CountAttachmentsTool>();
builder.Services.AddSingleton<ITool, TextMatchesAnyTool>();
builder.Services.AddSingleton<ITool, TextContainsAnyTool>();
builder.Services.AddSingleton<IToolDefinitionLoader, FileToolDefinitionLoader>();
builder.Services.AddSingleton<IToolRegistry>(sp => new ToolRegistry(
    sp.GetServices<ITool>(),
    sp.GetRequiredService<IToolDefinitionLoader>()));
builder.Services.AddSingleton<IRulesLoader, MarkdownRulesLoader>();
builder.Services.AddSingleton<ISystemPromptProvider, FileSystemPromptProvider>();
builder.Services.AddScoped<IChatService, SandkasseChatService>();
builder.Services.AddScoped<IEvaluationOrchestrator, EvaluationOrchestrator>();

// PDF/DOCX rendering + multipart upload parsing
builder.Services.AddScoped<IPdfGeneratorService, PdfGeneratorService>();
builder.Services.AddScoped<IDocxGeneratorService, DocxGeneratorService>();
builder.Services.AddScoped<IMultipartParserService, MultipartParserService>();

// Typed registries loaded from /etc/augmenter/registries/ (kommuner, bevillingstyper, alkoholgrupper, ...)
builder.Services.AddSingleton<RegistryProvider>();

// Mappers — keyed by mapping spec filename (stem) under ContentPaths.MappingsRoot.
// Each pipeline.yaml step's `mapper:` field is the key. Specs are discovered
// at startup so adding a new mapper is a config drop-in, no code change.
RegisterMappers(builder.Services, builder.Configuration);

static void RegisterMappers(IServiceCollection services, IConfiguration configuration)
{
    var contentPaths = configuration.GetSection(ContentPathsOptions.SectionName).Get<ContentPathsOptions>() ?? new();
    var postConfigure = new ContentPathsPostConfigure();
    postConfigure.PostConfigure(null, contentPaths);

    if (!Directory.Exists(contentPaths.MappingsRoot))
        return;

    foreach (var path in Directory.EnumerateFiles(contentPaths.MappingsRoot, "*.json"))
    {
        var key = Path.GetFileNameWithoutExtension(path);
        services.AddKeyedSingleton<IDataMapper>(key, (sp, _) =>
            new JsonPathMapper(path, sp.GetRequiredService<RegistryProvider>()));
    }
}

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

// Fail-fast on misconfigured mounts. The failure message documents the contract
// every tenant config repo must satisfy.
ConfigValidator.Validate(app.Services);

app.MapHealthEndpoints();
app.MapGenerateEndpoints();
app.MapGenerateAsyncEndpoints();

app.Run();

public partial class Program;
