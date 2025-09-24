namespace Altinn.Studio.Designer.Services.Implementation.GitOps;

public static class ManifestsPathHelper
{
    public static class BaseManifests
    {
        public static string DirectoryPath => "./base";
        public static string KustomizationPath => $"{DirectoryPath}/kustomization.yaml";
    }


    public static class EnvironmentManifests
    {
        public static string DirectoryPath(string environment) => $"./{environment}";
        public static string KustomizationPath(string environment) => $"{DirectoryPath(environment)}/kustomization.yaml";
        public static string KustomizationResourcesSection = "resources";
        public static string AppResourcePrefix = "../apps/";
        public static string KustomizationAppResource(string app) => $"../apps/{app}";
    }

    public static class AppManifests
    {
        public static string DirectoryPath => "./apps";
        public static string AppDirectoryPath(string app) => $"{DirectoryPath}/{app}";
        public static string KustomizationPath(string app) => $"{AppDirectoryPath(app)}/kustomization.yaml";
    }

}
