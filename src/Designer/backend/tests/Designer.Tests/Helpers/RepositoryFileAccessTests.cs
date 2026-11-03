using System;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Claims;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.TestAttributes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;

namespace Designer.Tests.Helpers;

public sealed class RepositoryFileAccessTests : IDisposable
{
    private readonly string _root = Directory.CreateTempSubdirectory().FullName;
    private readonly ServiceRepositorySettings _settings;
    private readonly AltinnGitRepositoryFactory _factory;
    private readonly DefaultHttpContext _http;
    private readonly string _repositoryPath;
    private readonly RepositoryService _service;
    private readonly AltinnRepoEditingContext _context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
        "ttd",
        "test-app",
        "testUser"
    );

    public RepositoryFileAccessTests()
    {
        _settings = new ServiceRepositorySettings { RepositoryLocation = _root };
        _factory = new AltinnGitRepositoryFactory(_settings);
        _repositoryPath = _factory.GetRepositoryPath("ttd", "test-app", "testUser");
        Directory.CreateDirectory(_repositoryPath);
        _http = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.Name, "testUser")], "test")),
        };
        _service = new RepositoryService(
            _settings,
            null,
            new HttpContextAccessor { HttpContext = _http },
            null,
            null,
            null,
            _factory,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    [Theory]
    [InlineData(".git/config")]
    [InlineData(".GIT/config")]
    [InlineData("nested/.git/config")]
    [InlineData(".git./config")]
    [InlineData(".git::$INDEX_ALLOCATION/config")]
    [InlineData("git~1/config")]
    [InlineData("nested\\.git\\config")]
    [InlineData("../outside.txt")]
    public async Task WorkingTreeOperations_ReservedOrEscapingPath_RejectAccess(string path)
    {
        var repository = new GitRepository(_root, _repositoryPath);
        await Assert.ThrowsAsync<ArgumentException>(() => repository.WriteTextByRelativePathAsync(path, "untrusted"));
        await Assert.ThrowsAsync<ArgumentException>(() => repository.ReadTextByRelativePathAsync(path));
        Assert.Throws<ArgumentException>(() => repository.OpenStreamByRelativePath(path));
        Assert.Throws<ArgumentException>(() => repository.DeleteFileByRelativePath(path));
        Assert.Null(_service.GetContents("ttd", "test-app", path));
    }

    [Fact]
    public async Task WorkingTreeOperations_NormalFile_RoundTrips()
    {
        var repository = new GitRepository(_root, _repositoryPath);
        await repository.WriteTextByRelativePathAsync(".gitignore", "bin/");
        Assert.Equal("bin/", await repository.ReadTextByRelativePathAsync(".gitignore"));
        Assert.Equal("bin/", Assert.Single(_service.GetContents("ttd", "test-app", ".gitignore")).Content);
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public async Task WorkingTreeOperations_LinkedFileAndDirectory_DoNotReadOrWriteTarget()
    {
        string outside = Path.Join(_root, "outside");
        Directory.CreateDirectory(outside);
        string marker = Path.Join(outside, "marker.txt");
        File.WriteAllText(marker, "synthetic marker");
        File.CreateSymbolicLink(Path.Join(_repositoryPath, "link.txt"), marker);
        Directory.CreateSymbolicLink(Path.Join(_repositoryPath, "linked-directory"), outside);
        var repository = new GitRepository(_root, _repositoryPath);
        foreach (string path in new[] { "link.txt", "linked-directory/marker.txt", "linked-directory/new.txt" })
        {
            await Assert.ThrowsAsync<ArgumentException>(() => repository.ReadTextByRelativePathAsync(path));
            await Assert.ThrowsAsync<ArgumentException>(() => repository.WriteTextByRelativePathAsync(path, "changed"));
            Assert.Null(_service.GetContents("ttd", "test-app", path));
        }
        Assert.Empty(_service.GetContents("ttd", "test-app"));
        Assert.Equal("synthetic marker", File.ReadAllText(marker));
        Assert.False(File.Exists(Path.Join(outside, "new.txt")));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void AppDevelopmentController_LinkedWidgetSettings_RejectsAccess()
    {
        string marker = Path.Join(_root, "marker.txt");
        File.WriteAllText(marker, "synthetic marker");
        string widget = _settings.GetWidgetSettingsPath("ttd", "test-app", "testUser");
        Directory.CreateDirectory(Path.GetDirectoryName(widget)!);
        File.CreateSymbolicLink(widget, marker);
        var controller = new AppDevelopmentController(null, _service, null, null, null, null)
        {
            ControllerContext = new ControllerContext { HttpContext = _http },
        };
        Assert.Throws<ArgumentException>(() => controller.GetWidgetSettings("ttd", "test-app"));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void RepositoryController_FullZip_ExcludesLinksAndGitMetadata()
    {
        File.WriteAllText(Path.Join(_root, "marker.txt"), "synthetic marker");
        File.CreateSymbolicLink(Path.Join(_repositoryPath, "link.txt"), Path.Join(_root, "marker.txt"));
        Directory.CreateSymbolicLink(Path.Join(_repositoryPath, "linked-directory"), _root);
        Directory.CreateDirectory(Path.Join(_repositoryPath, ".git"));
        File.WriteAllText(Path.Join(_repositoryPath, ".git/config"), "private metadata");
        File.WriteAllText(Path.Join(_repositoryPath, "app.txt"), "normal content");
        var controller = new RepositoryController(null, null, _service, null, null, null, null, null)
        {
            ControllerContext = new ControllerContext { HttpContext = _http },
        };
        var result = Assert.IsType<FileStreamResult>(controller.ContentsZip("ttd", "test-app", true));
        using var stream = result.FileStream;
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read);
        Assert.Equal("app.txt", Assert.Single(archive.Entries).FullName);
    }

    [Fact]
    public async Task OrgLibraryService_MetadataWriteAndDelete_RejectsAccess()
    {
        string path = _factory.GetRepositoryPath("ttd", "ttd-content", "testUser");
        Directory.CreateDirectory(Path.Join(path, ".git"));
        File.WriteAllText(Path.Join(path, ".git/config"), "original");
        var service = new OrgLibraryService(null, null, _factory, null, null);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateFile("ttd", "testUser", new FileMetadata(".git/config", "replacement"))
        );
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateFile("ttd", "testUser", new FileMetadata(".git/config", "cmVwbGFjZW1lbnQ=", "base64"))
        );
        await Assert.ThrowsAsync<ArgumentException>(() =>
            service.UpdateFile("ttd", "testUser", new FileMetadata(".git/config", null))
        );
        Assert.Equal("original", File.ReadAllText(Path.Join(path, ".git/config")));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void RepositoryController_ChangesZip_RejectsLinkedFiles()
    {
        string marker = Path.Join(_root, "marker.txt");
        File.WriteAllText(marker, "synthetic marker");
        File.CreateSymbolicLink(Path.Join(_repositoryPath, "link.txt"), marker);
        var sourceControl = new Mock<ISourceControl>();
        sourceControl
            .Setup(service => service.Status(It.IsAny<AltinnRepoEditingContext>()))
            .Returns([new RepositoryContent { FilePath = "link.txt" }]);
        var controller = new RepositoryController(null, sourceControl.Object, _service, null, null, null, null, null)
        {
            ControllerContext = new ControllerContext { HttpContext = _http },
        };
        Assert.Throws<ArgumentException>(() => controller.ContentsZip("ttd", "test-app", false));
    }

    [Fact]
    public async Task PrefillController_ScalarPayload_DoesNotChangeGitConfiguration()
    {
        Directory.CreateDirectory(Path.Join(_repositoryPath, ".git"));
        string config = Path.Join(_repositoryPath, ".git/config");
        File.WriteAllText(config, "original");
        var controller = new PrefillController(new PrefillService(_factory))
        {
            ControllerContext = new ControllerContext { HttpContext = _http },
        };
        var result = await controller.Put("ttd", "test-app", JsonValue.Create("replacement"), ".git/config");
        Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("original", File.ReadAllText(config));
    }

    [Theory]
    [InlineData(".git/config")]
    [InlineData("App/models/model.json")]
    [InlineData(".git/model.schema.json")]
    public async Task PrefillService_InvalidModelPath_RejectsWrite(string modelPath)
    {
        var controller = new PrefillController(new PrefillService(_factory))
        {
            ControllerContext = new ControllerContext { HttpContext = _http },
        };
        await Assert.ThrowsAsync<ArgumentException>(() =>
            controller.Put("ttd", "test-app", new JsonObject(), modelPath)
        );
    }

    [Theory]
    [InlineData("../../.git/config")]
    [InlineData("..\\..\\.git\\config")]
    [InlineData("/tmp/image.png")]
    public async Task ImagesService_PathInsteadOfFilename_RejectsUpload(string filename)
    {
        var service = new ImagesService(_factory);
        using var stream = new MemoryStream([1, 2, 3]);
        await Assert.ThrowsAsync<ArgumentException>(() => service.UploadImage(_context, filename, stream, true));
        Assert.Empty(Directory.EnumerateFileSystemEntries(_repositoryPath));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public async Task DirectoryCopy_LinkedDestination_LeavesTargetUnchanged()
    {
        string source = Directory.CreateDirectory(Path.Join(_root, "source")).FullName;
        File.WriteAllText(Path.Join(source, "file.txt"), "new");
        string marker = Path.Join(_root, "marker.txt");
        File.WriteAllText(marker, "original");
        File.CreateSymbolicLink(Path.Join(_repositoryPath, "file.txt"), marker);
        await Assert.ThrowsAsync<ArgumentException>(() => DirectoryHelper.CopyDirectoryAsync(source, _repositoryPath));
        Assert.Equal("original", File.ReadAllText(marker));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void AbsoluteDeletion_NormalizesBeforeAccess_LeavesExternalFileUntouched()
    {
        string outside = Directory.CreateDirectory(Path.Join(_root, "outside")).FullName;
        string child = Directory.CreateDirectory(Path.Join(outside, "child")).FullName;
        File.WriteAllText(Path.Join(outside, "marker.txt"), "original");
        File.WriteAllText(Path.Join(_repositoryPath, "marker.txt"), "local");
        Directory.CreateSymbolicLink(Path.Join(_repositoryPath, "link"), child);
        var repository = new GitRepository(_root, _repositoryPath);

        repository.DeleteFileByAbsolutePath(Path.Join(_repositoryPath, "link", "..", "marker.txt"));

        Assert.Equal("original", File.ReadAllText(Path.Join(outside, "marker.txt")));
        Assert.False(File.Exists(Path.Join(_repositoryPath, "marker.txt")));
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void RepositoryConstruction_LinkedParent_RejectsAccess()
    {
        string outside = Directory.CreateDirectory(Path.Join(_root, "outside")).FullName;
        Directory.CreateDirectory(Path.Join(outside, "repo"));
        string linkedParent = Path.Join(_root, "linked-parent");
        Directory.CreateSymbolicLink(linkedParent, outside);
        Assert.Throws<ArgumentException>(() => new GitRepository(_root, Path.Join(linkedParent, "repo")));
        Assert.Throws<ArgumentException>(() =>
            RepositoryFileAccess.Validate(linkedParent, Path.Join(linkedParent, "repo"))
        );
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public async Task DirectoryCopy_AndPatternMatching_ExcludeLinksAndMetadata()
    {
        string source = Directory.CreateDirectory(Path.Join(_root, "source")).FullName;
        Directory.CreateDirectory(Path.Join(source, ".git"));
        File.WriteAllText(Path.Join(source, ".git/config"), "metadata");
        File.WriteAllText(Path.Join(source, "app.csproj"), "normal content");
        File.CreateSymbolicLink(Path.Join(source, "link.csproj"), Path.Join(_root, "missing.csproj"));
        Directory.CreateSymbolicLink(Path.Join(source, "cycle"), source);

        await DirectoryHelper.CopyDirectoryAsync(source, _repositoryPath);

        Assert.Equal("normal content", File.ReadAllText(Path.Join(_repositoryPath, "app.csproj")));
        Assert.Single(Directory.EnumerateFileSystemEntries(_repositoryPath));
        Assert.Equal(
            Path.Join(source, "app.csproj"),
            Assert.Single(DirectoryHelper.ResolveFilesFromPattern(source, "**/*.csproj"))
        );
    }

    [SkipOnOsPlatformsFact("WINDOWS")]
    public void DirectoryDeletion_LinkedDirectory_LeavesTargetUnchanged()
    {
        string outside = Directory.CreateDirectory(Path.Join(_root, "outside")).FullName;
        File.WriteAllText(Path.Join(outside, "marker.txt"), "original");
        Directory.CreateSymbolicLink(Path.Join(_repositoryPath, "linked-directory"), outside);
        DirectoryHelper.DeleteFilesAndDirectory(_repositoryPath);
        Assert.Equal("original", File.ReadAllText(Path.Join(outside, "marker.txt")));
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);
}
