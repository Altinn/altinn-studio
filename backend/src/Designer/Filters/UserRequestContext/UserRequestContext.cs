namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public class UserRequestContext : IUserRequestContext
    {
        public string Org { get; }
        public string Repo { get; }
        public string Developer { get; }
    }
}
