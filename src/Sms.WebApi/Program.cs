using AspNetCoreRateLimit;
using Microsoft.OpenApi.Models;
using Sms.Infrastructure;
using Sms.Infrastructure.Data;
using Sms.WebApi.Hubs;
using Stripe; // هام: تأكد من تثبيت باكدج Stripe.net
using Microsoft.AspNetCore.Authentication.Google; // هام: تأكد من تثبيت باكدج Google Auth
// using Sms.Core.Settings; // لو كلاس EmailSettings موجود في Core شيل الـ comment

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. إعداد Stripe (يجب أن يكون في البداية)
// ==========================================
StripeConfiguration.ApiKey = builder.Configuration["Stripe:SecretKey"];

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ==========================================
// 2. إعداد Swagger
// ==========================================
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Online Courses Platform API",
        Version = "v1",
        Description = "API for online learning platform with courses, enrollments, assignments, quizzes, payments, email verification, and real-time chat",
        Contact = new OpenApiContact
        {
            Name = "Online Courses Platform",
            Email = "support@onlinecourses.com"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// ==========================================
// 3. Infrastructure & Authentication
// ==========================================
// إضافة الـ Infrastructure (التي تحتوي على الـ DbContext والـ Identity)
builder.Services.AddInfrastructure(builder.Configuration);

// إضافة Google Authentication
// بنستدعي AddAuthentication عشان نكمل على إعدادات الـ Identity/JWT الموجودة في Infrastructure
builder.Services.AddAuthentication()
    .AddGoogle(googleOptions =>
    {
        googleOptions.ClientId = builder.Configuration["Google:ClientId"];
        googleOptions.ClientSecret = builder.Configuration["Google:ClientSecret"];
    });

// ==========================================
// 4. إعداد Email Settings
// ==========================================
// هذا السطر يربط إعدادات الإيميل من ملف JSON بكلاس EmailSettings
// (تأكد إن عندك كلاس اسمه EmailSettings يطابق الحقول في ملف الـ JSON)
// builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("Email"));

// ==========================================
// 5. باقي الخدمات (Rate Limit, SignalR, CORS)
// ==========================================

// Data Seeder
builder.Services.AddScoped<DataSeeder>();

// Rate Limiting
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();

// SignalR
builder.Services.AddSignalR();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:5173" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Response caching
builder.Services.AddResponseCaching();

// ==========================================
// بناء التطبيق (Build App)
// ==========================================
var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Online Courses Platform API v1");
    });
}

// الترتيب هنا مهم جداً للميدل وير (Middleware Pipeline)

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();



app.UseIpRateLimiting();

app.UseResponseCaching();


// Static files for uploaded content
app.UseStaticFiles();

// Map controllers
app.MapControllers();

// Map SignalR hubs
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<NotificationHub>("/hubs/notification");

// ==========================================
// Seeding Data
// ==========================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        // Seed roles
        var roleManager = services.GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole<Guid>>>();
        string[] roles = { "Admin", "Instructor", "Student" };
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                await roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole<Guid>(role));
            }
        }

        // Seed data (only in Development)
        if (app.Environment.IsDevelopment())
        {
            var seeder = services.GetRequiredService<DataSeeder>();
            await seeder.SeedAsync();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();
    await seeder.SeedAsync();
    Console.WriteLine("✅ Data seeded successfully");
    return; // exit after seeding
}

app.Run();