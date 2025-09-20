public class RegularUser : User
{
    public string FirstName { get; set; }
    public string LastName { get; set; }

    public RegularUser()
    {
        Type = UserType.Regular;
    }
}