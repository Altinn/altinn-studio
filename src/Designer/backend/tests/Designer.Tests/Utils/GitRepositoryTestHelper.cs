using System;
using System.IO;
using Altinn.Studio.Designer.Constants;
using Designer.Tests.Fixtures;
using LibGit2Sharp;

namespace Designer.Tests.Utils;

internal static class GitRepositoryTestHelper
{
    public static string CloneRepository(string giteaUrl, string org, string repository)
    {
        string repositoryPath = Path.Combine(
            Path.GetTempPath(),
            "altinn",
            "tests",
            "git",
            Guid.NewGuid().ToString("N")
        );
        CloneOptions cloneOptions = new() { BranchName = General.DefaultBranch };
        cloneOptions.FetchOptions.CredentialsProvider = (_, _, _) =>
            new UsernamePasswordCredentials
            {
                Username = GiteaConstants.TestUser,
                Password = GiteaConstants.TestUserPassword,
            };
        Repository.Clone($"{giteaUrl.TrimEnd('/')}/{org}/{repository}.git", repositoryPath, cloneOptions);
        return repositoryPath;
    }

    public static string CommitAndPushFile(
        string repositoryPath,
        string relativeFilePath,
        string content,
        string commitMessage,
        bool addStudioNote = false
    )
    {
        using var repo = new Repository(repositoryPath);
        PushOptions pushOptions = new()
        {
            CredentialsProvider = (_, _, _) =>
                new UsernamePasswordCredentials
                {
                    Username = GiteaConstants.TestUser,
                    Password = GiteaConstants.TestUserPassword,
                },
        };

        if (addStudioNote)
        {
            Commands.Fetch(
                repo,
                "origin",
                ["refs/notes/*:refs/notes/*"],
                new FetchOptions { CredentialsProvider = pushOptions.CredentialsProvider },
                "fetch notes"
            );
        }

        string filePath = Path.Combine(repositoryPath, relativeFilePath);
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        File.WriteAllText(filePath, content);
        Commands.Stage(repo, relativeFilePath);

        Signature signature = CreateSignature();
        Commit commit = repo.Commit(commitMessage, signature, signature);
        if (addStudioNote)
        {
            repo.Notes.Add(commit.Id, "studio-commit", signature, signature, repo.Notes.DefaultNamespace);
        }

        repo.Network.Push(repo.Head, pushOptions);
        if (addStudioNote)
        {
            repo.Network.Push(repo.Network.Remotes["origin"], "refs/notes/commits", pushOptions);
        }

        return commit.Sha;
    }

    private static Signature CreateSignature() =>
        new(GiteaConstants.TestUser, GiteaConstants.TestUserEmail, DateTimeOffset.Now);
}
