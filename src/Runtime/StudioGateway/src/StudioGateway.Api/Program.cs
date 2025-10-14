var builder = WebApplication.CreateSlimBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Hello World!");

app.Run();
