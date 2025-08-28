using System.Runtime.Serialization;

namespace Altinn.Studio.Designer.Enums
{
    /// <summary>
    /// FileSystemObjectType
    /// </summary>
    public enum FileSystemObjectType
    {
        [EnumMember(Value = "file")]
        File,

        [EnumMember(Value = "dir")]
        Dir,

        [EnumMember(Value = "symlink")]
        Symlink,

        [EnumMember(Value = "submodule")]
        Submodule
    }
}
