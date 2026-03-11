using WorkflowEngine.Api.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.AddWorkflowEngine();

var app = builder.Build();
app.UseWorkflowEngine();
await app.RunAsync();

// Exposed for WebApplicationFactory<Program> in integration tests
public partial class Program;
