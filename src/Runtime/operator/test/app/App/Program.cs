using App;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHostedService<Worker>();

var app = builder.Build();

app.MapGet("/health", () => TypedResults.Ok());

app.Run();
