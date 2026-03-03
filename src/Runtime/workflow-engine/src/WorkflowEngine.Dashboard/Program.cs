var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet(
    "/api/config",
    (IConfiguration config) => Results.Json(new { engineUrl = config["Dashboard:EngineUrl"] ?? "" })
);

if (app.Environment.IsDevelopment() || app.Environment.EnvironmentName == "Docker")
{
    app.MapGet(
        "/api/hot-reload",
        async (IWebHostEnvironment env, HttpContext ctx, CancellationToken ct) =>
        {
            ctx.Response.ContentType = "text/event-stream";
            ctx.Response.Headers.CacheControl = "no-cache";
            ctx.Response.Headers.Connection = "keep-alive";

            // Polling-based: Docker bind mounts on Windows don't propagate
            // inotify events, so FileProvider.Watch() won't fire.
            var webRoot = env.WebRootPath;
            var lastHash = HashWebRoot(webRoot);
            var heartbeatInterval = 0;

            while (!ct.IsCancellationRequested)
            {
                await Task.Delay(500, ct);
                var currentHash = HashWebRoot(webRoot);
                if (currentHash != lastHash)
                {
                    lastHash = currentHash;
                    await ctx.Response.WriteAsync("data: reload\n\n", ct);
                    await ctx.Response.Body.FlushAsync(ct);
                }
                else if (++heartbeatInterval >= 10) // every 5s
                {
                    heartbeatInterval = 0;
                    await ctx.Response.WriteAsync(": heartbeat\n\n", ct);
                    await ctx.Response.Body.FlushAsync(ct);
                }
            }
        }
    );
}

static long HashWebRoot(string path)
{
    long hash = 0;
    foreach (var file in Directory.EnumerateFiles(path, "*.*", SearchOption.AllDirectories))
    {
        using var stream = File.OpenRead(file);
        int b;
        while ((b = stream.ReadByte()) != -1)
            hash = hash * 31 + b;
    }
    return hash;
}

await app.RunAsync();
