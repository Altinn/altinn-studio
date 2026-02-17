var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet(
    "/api/config",
    (IConfiguration config) => Results.Json(new { engineUrl = config["Dashboard:EngineUrl"] ?? "" })
);

await app.RunAsync();
