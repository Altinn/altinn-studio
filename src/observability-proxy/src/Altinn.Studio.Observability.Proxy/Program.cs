using Altinn.Studio.Observability.Proxy.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);
builder.AddObservabilityProxy();

var app = builder.Build();
app.UseObservabilityProxy();

await app.RunAsync();
