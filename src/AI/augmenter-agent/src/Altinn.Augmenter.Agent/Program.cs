using Altinn.Augmenter.Agent.Configuration;
using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Pipelines;
using Altinn.Augmenter.Agent.Pipelines.Generic;
using Altinn.Augmenter.Agent.Services;
using Altinn.Augmenter.Agent.Services.Agent.Chat;
using Altinn.Augmenter.Agent.Services.Agent.Orchestration;
using Altinn.Augmenter.Agent.Services.Agent.Tools;
using Altinn.Augmenter.Agent.Services.Registries;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;

var builder = WebApplication.CreateBuilder(args);

// Read runtime secrets (Agent:ApiKey, kvSetting, ...) from the Altinn platform
// secret-file mount when present. No-op outside the platform — env vars / .env
// then fill the same slots.
builder.Configuration.AddAltinnPlatformSecretFile();

// If the secret file supplied kvSetting credentials, layer Azure Key Vault on
// top so tenant-named secrets (e.g. ttd--app--<app-id>--<key>) become available
// at IConfiguration["ttd:app:<app-id>:<key>"]. Silent no-op when kvSetting
// is missing — local dev and non-Altinn platforms remain on .env.
builder.AddOptionalAzureKeyVault();

// Configuration
builder.Services.Configure<CallbackOptions>(builder.Configuration.GetSection(CallbackOptions.SectionName));
builder.Services.Configure<UploadOptions>(builder.Configuration.GetSection(UploadOptions.SectionName));
builder.Services.Configure<PdfGenerationOptions>(builder.Configuration.GetSection(PdfGenerationOptions.SectionName));
builder.Services.Configure<AgentOptions>(builder.Configuration.GetSection(AgentOptions.SectionName));
builder.Services.AddSingleton<IPostConfigureOptions<AgentOptions>, AgentOptionsPostConfigure>();
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
builder.Services.AddSingleton<ITool, HoursBetweenTimesTool>();
builder.Services.AddSingleton<ITool, CurrentDateTool>();
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

// Mappers — lazy file-system lookup by name. Resolves <MappingsRoot>/<name>.json
// on first request so ContentPaths overrides from test factories / override
// compose files actually take effect (a startup-time folder scan would freeze
// the wrong path before those overrides are applied).
builder.Services.AddSingleton<IDataMapperRegistry, FileSystemDataMapperRegistry>();

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
