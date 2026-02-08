using Altinn.Augmenter.Agent.Endpoints;
using Altinn.Augmenter.Agent.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddScoped<IPdfGeneratorService, PdfGeneratorService>();
builder.Services.AddScoped<IMultipartParserService, MultipartParserService>();
builder.Services.AddHttpClient<ICallbackService, CallbackService>();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapGenerateEndpoints();
app.MapGenerateAsyncEndpoints();

app.Run();

public partial class Program;
