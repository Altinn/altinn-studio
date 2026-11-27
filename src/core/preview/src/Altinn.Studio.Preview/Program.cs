using Altinn.Studio.Preview.Hosting;

var builder = WebApplication.CreateBuilder(args);
builder.AddPreview();

var app = builder.Build();
app.UsePreview();

await app.RunAsync();
