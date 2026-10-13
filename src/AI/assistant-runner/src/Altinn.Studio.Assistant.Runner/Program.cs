using Altinn.Studio.Assistant.Runner;

var jobUser = JobUser.Find();
JobRunner.PrepareSharedFolders();

// A deploy lets a running upgrade end, and the upgrade timeout is 11 minutes. The pod waits longer.
var shutdownTimeout = TimeSpan.FromMinutes(12);

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.Configure<HostOptions>(options => options.ShutdownTimeout = shutdownTimeout);
builder.AddRunnerApi();
builder.Services.AddSingleton<IJobRunner>(services => new JobRunner(
    jobUser,
    services.GetRequiredService<ILogger<JobRunner>>()
));

var app = builder.Build();
app.MapRunnerApi();

await app.RunAsync();
