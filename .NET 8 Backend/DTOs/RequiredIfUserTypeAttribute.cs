using System.ComponentModel.DataAnnotations;

public class RequiredIfUserTypeAttribute : ValidationAttribute
{
    private readonly UserType _requiredUserType;

    public RequiredIfUserTypeAttribute(UserType requiredUserType)
    {
        _requiredUserType = requiredUserType;
    }

    protected override ValidationResult IsValid(object value, ValidationContext validationContext)
    {
        var registerDto = validationContext.ObjectInstance as RegisterDto;
        if (registerDto == null)
        {
            return new ValidationResult("This attribute can only be used on RegisterDto properties.");
        }

        // Only validate if the current UserType matches the one this field is required for
        if (registerDto.UserType == _requiredUserType)
        {
            if (value == null || (value is string strValue && string.IsNullOrWhiteSpace(strValue)))
            {
                return new ValidationResult(ErrorMessage ?? $"The {validationContext.DisplayName} field is required for {_requiredUserType} users.");
            }
        }

        return ValidationResult.Success;
    }
}