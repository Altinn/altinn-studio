using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet(
    "/api/config",
    (IConfiguration config) => Results.Json(new { engineUrl = config["Dashboard:EngineUrl"] ?? "" })
);

app.MapGet(
    "/api/hot-reload",
    async (IWebHostEnvironment env, HttpContext ctx, CancellationToken ct) =>
    {
        ctx.Response.ContentType = "text/event-stream";
        ctx.Response.Headers.CacheControl = "no-cache";
        ctx.Response.Headers.Connection = "keep-alive";

        var fileProvider = env.WebRootFileProvider;
        while (!ct.IsCancellationRequested)
        {
            var tcs = new TaskCompletionSource();
            var watcher = fileProvider.Watch("**/*.*");
            using var cbReg = watcher.RegisterChangeCallback(_ => tcs.TrySetResult(), null);

            using var reg = ct.Register(() => tcs.TrySetCanceled());
            try
            {
                await tcs.Task;
            }
            catch (TaskCanceledException)
            {
                break;
            }

            await Task.Delay(100, ct); // debounce rapid saves
            await ctx.Response.WriteAsync("data: reload\n\n", ct);
            await ctx.Response.Body.FlushAsync(ct);
        }
    }
);

await app.RunAsync();
