using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

public class GitRepositoryTests
{
    [Theory]
    [InlineData("")]
    [InlineData(@"This should be read back with the same formatting!\n")]
    [InlineData(@"{""some"":""random"", ""json"":""value""}")]
    public async Task WriteTextByRelativePathAsync_ValidText_ShouldReadBackEqual(string expectedContent)
    {
        string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        string repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );

        var filename = $"{Guid.NewGuid()}.json";
        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, expectedContent);
            var actualContent = await gitRepository.ReadTextByRelativePathAsync(filename);

            Assert.Equal(expectedContent, actualContent);
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Theory]
    [InlineData(@"App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json")]
    [InlineData(@"App/models/HvemErHvem.json")]
    [InlineData(@"App/models/HvemErHvem_FlatNoTypes.schema.json")]
    [InlineData(@"App/models/HvemErHvem_SERES.schema.json")]
    [InlineData(@"/App/models/HvemErHvem_SERES.schema.json")]
    public async Task WriteTextByRelativePathAsync_ReadWriteRoundtrip_ShouldReadBackEqual(string expectedFilePath)
    {
        var org = "ttd";
        var sourceRepository = "hvem-er-hvem";
        var developer = "testUser";
        var targetRepository = TestDataHelper.GenerateTestRepoName();

        string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = await TestDataHelper.CopyRepositoryForTest(
            org,
            sourceRepository,
            developer,
            targetRepository
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );

        var expectedContent = await gitRepository.ReadTextByRelativePathAsync(expectedFilePath);

        var filename = $"{Guid.NewGuid()}.json";
        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, expectedContent);
            var actualContent = await gitRepository.ReadTextByRelativePathAsync(filename);

            Assert.Equal(expectedContent, actualContent);
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Fact]
    public async Task WriteTextByRelativePathAsync_RelativePathOutsideParent_ShouldThrowArgumentException()
    {
        Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository(
            "ttd",
            "hvem-er-hvem",
            "testUser"
        );

        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await gitRepository.WriteTextByRelativePathAsync(@"../should.not.exist", "some content")
        );
    }

    [Fact]
    public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldThrowException()
    {
        Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository(
            "ttd",
            "hvem-er-hvem",
            "testUser"
        );

        var relativeFileUrl = "test_this/does/not/exits/deleteme.txt";
        Assert.False(gitRepository.FileExistsByRelativePath(relativeFileUrl));
        await Assert.ThrowsAsync<DirectoryNotFoundException>(async () =>
            await gitRepository.WriteTextByRelativePathAsync(relativeFileUrl, "this file should not be here", false)
        );
    }

    [Fact]
    public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldCreateDirectory()
    {
        var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );

        var relativeFileUrl = "test_directory/should/be/created/deleteme.txt";
        Assert.False(gitRepository.FileExistsByRelativePath(relativeFileUrl));

        try
        {
            await gitRepository.WriteTextByRelativePathAsync(relativeFileUrl, "this file should be here", true);

            Assert.True(gitRepository.FileExistsByRelativePath(relativeFileUrl));
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Fact]
    public async Task WriteTextByRelativePathAsync_FileOpenForReading_ShouldReplaceFile()
    {
        var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );
        var filename = $"{Guid.NewGuid()}.txt";

        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, "old content");
            await using (Stream openForReading = gitRepository.OpenStreamByRelativePath(filename))
            {
                await gitRepository.WriteTextByRelativePathAsync(filename, "new content");

                using var reader = new StreamReader(openForReading);
                Assert.Equal("old content", await reader.ReadToEndAsync());
            }

            Assert.Equal("new content", await gitRepository.ReadTextByRelativePathAsync(filename));
            Assert.Equal([filename], Directory.GetFiles(repositoryDirectory).Select(Path.GetFileName));
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Fact]
    public async Task WriteTextByRelativePathAsync_ExistingFile_ShouldKeepFileMode()
    {
        if (OperatingSystem.IsWindows())
        {
            // Unix file modes do not exist on Windows.
            return;
        }

        var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );
        var filename = $"{Guid.NewGuid()}.sh";
        const UnixFileMode Executable =
            UnixFileMode.UserRead
            | UnixFileMode.UserWrite
            | UnixFileMode.UserExecute
            | UnixFileMode.GroupRead
            | UnixFileMode.GroupExecute;

        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, "old content");
            File.SetUnixFileMode(Path.Combine(repositoryDirectory, filename), Executable);

            await gitRepository.WriteTextByRelativePathAsync(filename, "new content");

            Assert.Equal(Executable, File.GetUnixFileMode(Path.Combine(repositoryDirectory, filename)));
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Fact]
    public async Task WriteStreamByRelativePathAsync_ReadDuringWrite_ShouldReadPreviousContent()
    {
        var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );
        var filename = $"{Guid.NewGuid()}.txt";

        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, "old content");
            var content = new PausingStream(Encoding.UTF8.GetBytes("new "), Encoding.UTF8.GetBytes("content"));
            Task write = gitRepository.WriteStreamByRelativePathAsync(filename, content);
            await content.Paused;

            Assert.Equal("old content", await gitRepository.ReadTextByRelativePathAsync(filename));

            content.Resume();
            await write;
            Assert.Equal("new content", await gitRepository.ReadTextByRelativePathAsync(filename));
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Fact]
    public async Task WriteStreamByRelativePathAsync_WriteFails_ShouldKeepPreviousContent()
    {
        var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest(
            "ttd",
            TestDataHelper.GenerateTestRepoName(),
            "testUser"
        );
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );
        var filename = $"{Guid.NewGuid()}.txt";

        try
        {
            await gitRepository.WriteTextByRelativePathAsync(filename, "old content");
            var content = new PausingStream(Encoding.UTF8.GetBytes("new "), Encoding.UTF8.GetBytes("content"));
            Task write = gitRepository.WriteStreamByRelativePathAsync(filename, content);
            await content.Paused;

            content.Fail(new IOException("The request was aborted."));

            await Assert.ThrowsAsync<IOException>(() => write);
            Assert.Equal("old content", await gitRepository.ReadTextByRelativePathAsync(filename));
            Assert.Equal([filename], Directory.GetFiles(repositoryDirectory).Select(Path.GetFileName));
        }
        finally
        {
            TestDataHelper.DeleteDirectory(repositoryDirectory);
        }
    }

    [Theory]
    [InlineData(@"this.dont.exists.schema.json")]
    [InlineData(@"c:/this/should/not/exist/HvemErHvem.json")]
    public void FileExistsByRelativePath_FileDontExits_ShouldReturnFalse(string relativePath)
    {
        var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

        Assert.False(gitRepository.FileExistsByRelativePath(relativePath));
    }

    [Theory]
    [InlineData(@"App/models/HvemErHvem.json")]
    [InlineData(@"App\models\HvemErHvem.json")]
    [InlineData(@"/App/models/HvemErHvem.json")]
    [InlineData(@"\App\models\HvemErHvem.json")]
    public void FileExistsByRelativePath_FileExits_ShouldReturnTrue(string relativePath)
    {
        var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

        Assert.True(gitRepository.FileExistsByRelativePath(relativePath));
    }

    [Fact]
    public void DirectoryExistsByRelativePath_Directory_ShouldReturnFalse()
    {
        var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

        Assert.False(gitRepository.DirectoryExistsByRelativePath("c:/this/does/not/exists"));
    }

    [Fact]
    public void CopyRepository_DirectoryAlreadyExists_AllFilesSuccessfullyCopied()
    {
        // Arrange
        string targetPath = TestDataHelper.CreateEmptyDirectory("cloneDirectory");
        var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

        try
        {
            // Act
            gitRepository.CopyRepository(targetPath);
            int actualFileCount = Directory.GetFiles(targetPath, "*", SearchOption.AllDirectories).Length;

            // Assert
            int expectedFileCount = Directory
                .GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories)
                .Length;

            Assert.Equal(expectedFileCount, actualFileCount);
        }
        finally
        {
            Directory.Delete(targetPath, true);
        }
    }

    [Fact]
    public void CopyRepository_DirDoestNotExists_DirCreatedAndFilesCopied()
    {
        // Arrange
        string targetPath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), "newClonedApp");
        var gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

        try
        {
            // Act
            gitRepository.CopyRepository(targetPath);
            int actualFileCount = Directory.GetFiles(targetPath, "*", SearchOption.AllDirectories).Length;

            // Assert
            int expectedFileCount = Directory
                .GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories)
                .Length;

            Assert.True(Directory.Exists(targetPath));
            Assert.Equal(expectedFileCount, actualFileCount);
        }
        finally
        {
            Directory.Delete(targetPath, true);
        }
    }

    private static Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository GetTestRepository(
        string org,
        string repository,
        string developer
    )
    {
        string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
        var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(
            repositoriesRootDirectory,
            repositoryDirectory
        );

        return gitRepository;
    }

    /// <summary>
    /// A readable stream that returns its first part, then waits until the test resumes or fails it.
    /// </summary>
    private sealed class PausingStream(byte[] firstPart, byte[] secondPart) : Stream
    {
        private readonly TaskCompletionSource _paused = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private readonly TaskCompletionSource _resumed = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _readCount;

        public Task Paused => _paused.Task;

        public void Resume() => _resumed.SetResult();

        public void Fail(Exception exception) => _resumed.SetException(exception);

        public override async ValueTask<int> ReadAsync(
            Memory<byte> buffer,
            CancellationToken cancellationToken = default
        )
        {
            switch (_readCount++)
            {
                case 0:
                    firstPart.CopyTo(buffer);
                    return firstPart.Length;
                case 1:
                    _paused.SetResult();
                    await _resumed.Task;
                    secondPart.CopyTo(buffer);
                    return secondPart.Length;
                default:
                    return 0;
            }
        }

        public override Task<int> ReadAsync(
            byte[] buffer,
            int offset,
            int count,
            CancellationToken cancellationToken
        ) => ReadAsync(buffer.AsMemory(offset, count), cancellationToken).AsTask();

        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();

        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position
        {
            get => throw new NotSupportedException();
            set => throw new NotSupportedException();
        }

        public override void Flush() { }

        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();

        public override void SetLength(long value) => throw new NotSupportedException();

        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
