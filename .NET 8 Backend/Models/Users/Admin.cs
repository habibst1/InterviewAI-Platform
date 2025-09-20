public class Admin : User
{
    public string Department { get; set; }

    public Admin()
    {
        Type = UserType.Admin;
    }
}