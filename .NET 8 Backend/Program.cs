using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);


// Add logging configuration
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();
builder.Logging.AddConfiguration(builder.Configuration.GetSection("Logging"));

// Add services
builder.Services.AddSingleton<IEmailService, SmtpEmailService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<PublicInterviewService>();
builder.Services.AddScoped<CompanyInterviewService>();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddSingleton<IStorageService, TempFileStorageService>();

builder.Services.AddHttpClient<IPythonAIService, PythonAIService>(client =>
{
    var baseUrl = builder.Configuration["PythonService:BaseUrl"];
    client.BaseAddress = new Uri(baseUrl!);
});


builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// 1. ADD AUTHENTICATION FIRST
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = IdentityConstants.ApplicationScheme;
    options.DefaultSignInScheme = IdentityConstants.ApplicationScheme;
    options.DefaultAuthenticateScheme = IdentityConstants.ApplicationScheme;
})
.AddIdentityCookies(); // Enables cookie authentication

// Add Data Protection
builder.Services.AddDataProtection();

// CORS configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", builder =>
    {
        builder.WithOrigins("http://localhost:5173", "http://localhost:3000", "http://localhost:8000")
               .AllowAnyMethod()
               .AllowAnyHeader()
               .AllowCredentials();
    });
});

// 2. UPDATED IDENTITY CONFIGURATION
builder.Services.AddIdentityCore<User>(options =>
{
    options.Password.RequireDigit = false;
    options.Password.RequiredLength = 6;
    options.Password.RequireNonAlphanumeric = false;
    options.Password.RequireUppercase = false;
})
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddSignInManager<SignInManager<User>>() // 3. ADD SIGNIN MANAGER
    .AddDefaultTokenProviders();

// Configure cookie settings
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.ExpireTimeSpan = TimeSpan.FromMinutes(60);
    options.LoginPath = "/api/auth/login";
    options.AccessDeniedPath = "/api/auth/access-denied";
    options.SlidingExpiration = true;
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger configuration
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
});

// Authorization policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireClaim("UserType", UserType.Admin.ToString()));

    options.AddPolicy("CompanyOnly", policy =>
        policy.RequireClaim("UserType", UserType.Company.ToString()));

    options.AddPolicy("RegularUserOnly", policy =>
        policy.RequireClaim("UserType", UserType.Regular.ToString()));
});

var app = builder.Build();

// 4. IMPROVED ERROR HANDLING
app.UseExceptionHandler("/error");
app.UseStatusCodePagesWithReExecute("/error/{0}");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "User API V1");
        c.ConfigObject.AdditionalItems.Add("persistAuthorization", "true");
    });
}


app.UseStaticFiles(); // Enable serving files from wwwroot
app.UseHttpsRedirection();
app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// 6. ADD ERROR HANDLING ENDPOINT
app.Map("/error", (HttpContext context) =>
{
    var exceptionHandler = context.Features.Get<IExceptionHandlerFeature>();
    return Results.Problem(
        title: "An error occurred",
        detail: exceptionHandler?.Error.Message,
        statusCode: context.Response.StatusCode
    );
});

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

app.Run();