using System.Threading.Tasks;

namespace Altinn.Studio.Designer.Services.Interfaces;

/// <summary>
/// Whether the current user may see the platform-wide admin pages.
/// </summary>
public interface IStudioPlatformAccessService
{
    Task<bool> HasPlatformAccessAsync();
}
