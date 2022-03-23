using System;
using System.IO;
using System.Threading.Tasks;

using Designer.Tests.Utils;

using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class GitRepositoryTests
    {
        [Theory]
        [InlineData("")]
        [InlineData(@"This should be read back with the same formatting!\n")]
        [InlineData(@"{""some"":""random"", ""json"":""value""}")]
        public async Task WriteTextByRelativePathAsync_ValidText_ShouldReadBackEqual(string expectedContent)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest("ttd", Guid.NewGuid().ToString(), "testUser");
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

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
        [InlineData(@"app/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.metadata.json")]
        [InlineData(@"app/models/HvemErHvem.json")]
        [InlineData(@"app/models/HvemErHvem_FlatNoTypes.schema.json")]
        [InlineData(@"app/models/HvemErHvem_SERES.schema.json")]
        [InlineData(@"/app/models/HvemErHvem_SERES.schema.json")]
        public async Task WriteTextByRelativePathAsync_ReadWriteRoundtrip_ShouldReadBackEqual(string expectedFilePath)
        {
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

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
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            await Assert.ThrowsAsync<ArgumentException>(async () => await gitRepository.WriteTextByRelativePathAsync(@"../should.not.exist", "some content"));
        }

        [Fact]
        public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldThrowException()
        {
            Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository gitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testUser");

            var relativeFileUrl = "test_this/does/not/exits/deleteme.txt";
            Assert.False(gitRepository.FileExistsByRelativePath(relativeFileUrl));
            await Assert.ThrowsAsync<DirectoryNotFoundException>(async () => await gitRepository.WriteTextByRelativePathAsync(relativeFileUrl, "this file should not be here", false));
        }

        [Fact]
        public async Task WriteTextByRelativePathAsync_PathDontExist_ShouldCreateDirectory()
        {
            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = TestDataHelper.CreateEmptyRepositoryForTest("ttd", Guid.NewGuid().ToString(), "testUser");
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

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

            Assert.False(gitRepository.DirectoryExitsByRelativePath("c:/this/does/not/exists"));
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
                int expectedFileCount = Directory.GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories).Length;

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
                int expectedFileCount = Directory.GetFiles(gitRepository.RepositoryDirectory, "*", SearchOption.AllDirectories).Length;

                Assert.True(Directory.Exists(targetPath));
                Assert.Equal(expectedFileCount, actualFileCount);
            }
            finally
            {
                Directory.Delete(targetPath, true);
            }
        }

        private static Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository GetTestRepository(string org, string repository, string developer)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);
            var gitRepository = new Altinn.Studio.Designer.Infrastructure.GitRepository.GitRepository(repositoriesRootDirectory, repositoryDirectory);

            return gitRepository;
        }
    }
}
