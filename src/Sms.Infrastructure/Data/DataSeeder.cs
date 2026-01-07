using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Sms.Domain.Entities;
using Sms.Domain.Enums;

namespace Sms.Infrastructure.Data;

public class DataSeeder
{
    private readonly ApplicationDbContext _context;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;
    private readonly ILogger<DataSeeder> _logger;

    public DataSeeder(
        ApplicationDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        ILogger<DataSeeder> logger)
    {
        _context = context;
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public async Task SeedAsync()
    {
        try
        {
            // Check if already seeded
            if (await _context.Users.AnyAsync(u => u.Email == "admin@onlinecourses.com"))
            {
                _logger.LogInformation("Database already seeded. Skipping...");
                return;
            }

            _logger.LogInformation("Starting database seeding...");

            // Seed Roles
            await SeedRolesAsync();

            // Seed Users
            var (admin, instructors, students) = await SeedUsersAsync();

            // Seed Courses
            var courses = await SeedCoursesAsync(instructors);

            // Seed Sessions
            await SeedSessionsAsync(courses);

            // Seed Enrollments
            await SeedEnrollmentsAsync(students, courses);

            // Seed Assignments
            await SeedAssignmentsAsync(courses);

            // Seed Quizzes
            await SeedQuizzesAsync(courses);

            // Seed Notifications
            await SeedNotificationsAsync(students);

            _logger.LogInformation("Database seeding completed successfully!");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred while seeding database");
            throw;
        }
    }

    private async Task SeedRolesAsync()
    {
        string[] roles = { "Admin", "Instructor", "Student" };
        foreach (var role in roles)
        {
            if (!await _roleManager.RoleExistsAsync(role))
            {
                await _roleManager.CreateAsync(new IdentityRole<Guid>(role));
            }
        }
    }

    private async Task<(ApplicationUser Admin, List<ApplicationUser> Instructors, List<ApplicationUser> Students)> SeedUsersAsync()
    {
        // Create Admin
        var admin = new ApplicationUser
        {
            UserName = "admin@onlinecourses.com",
            Email = "admin@onlinecourses.com",
            FirstName = "System",
            LastName = "Administrator",
            Role = UserRole.Admin,
            EmailConfirmed = true,
            IsActive = true
        };
        await _userManager.CreateAsync(admin, "Admin123!");
        await _userManager.AddToRoleAsync(admin, "Admin");

        // Create Instructors
        var instructors = new List<ApplicationUser>();
        var instructorData = new[]
        {
            ("John", "Smith"),
            ("Sarah", "Johnson"),
            ("Michael", "Brown"),
            ("Emily", "Davis")
        };

        for (int i = 0; i < instructorData.Length; i++)
        {
            var instructor = new ApplicationUser
            {
                UserName = $"instructor{i + 1}@onlinecourses.com",
                Email = $"instructor{i + 1}@onlinecourses.com",
                FirstName = instructorData[i].Item1,
                LastName = instructorData[i].Item2,
                Role = UserRole.Instructor,
                EmailConfirmed = true,
                IsActive = true
            };
            await _userManager.CreateAsync(instructor, "Instructor123!");
            await _userManager.AddToRoleAsync(instructor, "Instructor");
            instructors.Add(instructor);
        }

        // Create Students
        var students = new List<ApplicationUser>();
        var studentNames = new[]
        {
            ("Alice", "Williams"), ("Bob", "Miller"), ("Charlie", "Wilson"),
            ("Diana", "Moore"), ("Edward", "Taylor"), ("Fiona", "Anderson"),
            ("George", "Thomas"), ("Hannah", "Jackson"), ("Ivan", "White"),
            ("Julia", "Harris")
        };

        for (int i = 0; i < studentNames.Length; i++)
        {
            var student = new ApplicationUser
            {
                UserName = $"student{i + 1}@onlinecourses.com",
                Email = $"student{i + 1}@onlinecourses.com",
                FirstName = studentNames[i].Item1,
                LastName = studentNames[i].Item2,
                Role = UserRole.Student,
                EmailConfirmed = true,
                IsActive = true
            };
            await _userManager.CreateAsync(student, "Student123!");
            await _userManager.AddToRoleAsync(student, "Student");
            students.Add(student);
        }

        _logger.LogInformation("Seeded {Count} users (1 admin, 4 instructors, 10 students)", 15);
        return (admin, instructors, students);
    }

    private async Task<List<Course>> SeedCoursesAsync(List<ApplicationUser> instructors)
    {
        var courses = new List<Course>
        {
            new() { Code = "CS101", Name = "Introduction to Programming", Description = "Learn the fundamentals of programming using Python. Perfect for beginners!", PreviewDescription = "Learn Python basics in this beginner-friendly course.", Credits = 3, Semester = "Fall", Year = 2024, Price = 99.99m, InstructorId = instructors[2].Id },
            new() { Code = "WEB201", Name = "Web Development with React", Description = "Build modern web applications using React, TypeScript, and modern tools.", PreviewDescription = "Master React and modern web development.", Credits = 4, Semester = "Fall", Year = 2024, Price = 149.99m, InstructorId = instructors[1].Id },
            new() { Code = "DS301", Name = "Data Science Fundamentals", Description = "Introduction to data analysis, visualization, and machine learning basics.", PreviewDescription = "Start your journey into data science.", Credits = 4, Semester = "Fall", Year = 2024, Price = 199.99m, InstructorId = instructors[0].Id },
            new() { Code = "MOB201", Name = "Mobile App Development", Description = "Create cross-platform mobile apps with React Native.", PreviewDescription = "Build iOS and Android apps with one codebase.", Credits = 3, Semester = "Fall", Year = 2024, Price = 129.99m, InstructorId = instructors[1].Id },
            new() { Code = "ML401", Name = "Machine Learning Basics", Description = "Introduction to supervised and unsupervised learning algorithms.", PreviewDescription = "Learn ML algorithms and techniques.", Credits = 4, Semester = "Spring", Year = 2025, Price = 249.99m, InstructorId = instructors[0].Id },
            new() { Code = "DB201", Name = "Database Design & SQL", Description = "Master relational database design and SQL queries.", PreviewDescription = "Master databases and SQL.", Credits = 3, Semester = "Spring", Year = 2025, Price = 89.99m, InstructorId = instructors[2].Id },
            new() { Code = "CLD301", Name = "Cloud Computing with AWS", Description = "Learn to deploy and manage applications on Amazon Web Services.", PreviewDescription = "Get started with AWS cloud services.", Credits = 4, Semester = "Spring", Year = 2025, Price = 179.99m, InstructorId = instructors[3].Id },
            new() { Code = "SEC201", Name = "Cybersecurity Essentials", Description = "Understand security principles, threats, and countermeasures.", PreviewDescription = "Learn to secure systems and networks.", Credits = 3, Semester = "Fall", Year = 2024, Price = 159.99m, InstructorId = instructors[3].Id },
            new() { Code = "DEV301", Name = "DevOps & CI/CD", Description = "Master continuous integration and deployment practices.", PreviewDescription = "Automate your development pipeline.", Credits = 3, Semester = "Spring", Year = 2025, Price = 169.99m, InstructorId = instructors[3].Id },
            new() { Code = "AI401", Name = "Artificial Intelligence", Description = "Explore AI concepts, neural networks, and deep learning.", PreviewDescription = "Dive into AI and neural networks.", Credits = 4, Semester = "Spring", Year = 2025, Price = 299.99m, InstructorId = instructors[0].Id }
        };

        await _context.Courses.AddRangeAsync(courses);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} courses", courses.Count);
        return courses;
    }

    private async Task SeedSessionsAsync(List<Course> courses)
    {
        var sessions = new List<Session>();

        foreach (var course in courses)
        {
            // Each course gets 3 sessions
            for (int i = 1; i <= 3; i++)
            {
                sessions.Add(new Session
                {
                    CourseId = course.Id,
                    Title = $"Session {i}: {GetSessionTitle(course.Code, i)}",
                    Description = $"In this session, you will learn key concepts related to {course.Name}. This is session {i} of the course.",
                    Order = i,
                    IsActive = true
                });
            }
        }

        await _context.Sessions.AddRangeAsync(sessions);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} sessions", sessions.Count);
    }

    private string GetSessionTitle(string courseCode, int sessionNumber)
    {
        return sessionNumber switch
        {
            1 => "Introduction & Setup",
            2 => "Core Concepts",
            3 => "Practical Applications",
            _ => $"Part {sessionNumber}"
        };
    }

    private async Task SeedEnrollmentsAsync(List<ApplicationUser> students, List<Course> courses)
    {
        var enrollments = new List<Enrollment>();
        var random = new Random(42);

        foreach (var student in students)
        {
            var coursesToEnroll = courses.OrderBy(_ => random.Next()).Take(random.Next(2, 5)).ToList();
            foreach (var course in coursesToEnroll)
            {
                enrollments.Add(new Enrollment
                {
                    StudentId = student.Id,
                    CourseId = course.Id,
                    EnrolledAt = DateTime.UtcNow.AddDays(-random.Next(1, 30)),
                    IsActive = true,
                    FinalGrade = random.Next(0, 10) > 3 ? Math.Round((decimal)(70 + random.NextDouble() * 30), 2) : null
                });
            }
        }

        await _context.Enrollments.AddRangeAsync(enrollments);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} enrollments", enrollments.Count);
    }

    private async Task SeedAssignmentsAsync(List<Course> courses)
    {
        var assignments = new List<Assignment>();

        var assignmentTemplates = new[]
        {
            ("Programming Exercise", "Complete the coding exercises to practice the concepts learned."),
            ("Project Milestone", "Submit the current milestone of your course project.")
        };

        foreach (var course in courses)
        {
            for (int i = 0; i < 2; i++)
            {
                var template = assignmentTemplates[i % assignmentTemplates.Length];
                assignments.Add(new Assignment
                {
                    Title = $"{course.Code} - {template.Item1} {i + 1}",
                    Description = template.Item2,
                    CourseId = course.Id,
                    CreatedById = course.InstructorId,
                    DueDate = DateTime.UtcNow.AddDays(7 + (i * 14)),
                    MaxScore = 100,
                    AllowedFileTypes = ".pdf,.docx,.zip"
                });
            }
        }

        await _context.Assignments.AddRangeAsync(assignments);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} assignments", assignments.Count);
    }

    private async Task SeedQuizzesAsync(List<Course> courses)
    {
        var quizzes = new List<Quiz>();

        foreach (var course in courses)
        {
            var quiz = new Quiz
            {
                Title = $"{course.Code} - Midterm Quiz",
                Description = $"Test your knowledge of {course.Name} concepts.",
                CourseId = course.Id,
                CreatedById = course.InstructorId,
                StartTime = DateTime.UtcNow.AddDays(-7),
                EndTime = DateTime.UtcNow.AddDays(30),
                DurationMinutes = 45,
                TotalMarks = 100,
                ShuffleQuestions = true,
                Questions = new List<QuizQuestion>
                {
                    new() { QuestionText = $"What is a key concept in {course.Name}?", QuestionType = QuestionType.MultipleChoice, Options = "[\"Option A\", \"Option B\", \"Option C\", \"Option D\"]", CorrectAnswer = "Option A", Marks = 20, Order = 1 },
                    new() { QuestionText = $"Explain the main benefit of {course.Name}.", QuestionType = QuestionType.ShortAnswer, CorrectAnswer = "Efficiency and productivity", Marks = 20, Order = 2 },
                    new() { QuestionText = $"True or False: {course.Name} is essential for modern development.", QuestionType = QuestionType.TrueFalse, Options = "[\"True\", \"False\"]", CorrectAnswer = "True", Marks = 20, Order = 3 },
                    new() { QuestionText = "Which of the following best describes this course's target audience?", QuestionType = QuestionType.MultipleChoice, Options = "[\"Beginners\", \"Intermediate\", \"Advanced\", \"All levels\"]", CorrectAnswer = "All levels", Marks = 20, Order = 4 },
                    new() { QuestionText = "What skill will you develop most in this course?", QuestionType = QuestionType.ShortAnswer, CorrectAnswer = "Problem-solving", Marks = 20, Order = 5 }
                }
            };
            quizzes.Add(quiz);
        }

        await _context.Quizzes.AddRangeAsync(quizzes);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} quizzes with questions", quizzes.Count);
    }

    private async Task SeedNotificationsAsync(List<ApplicationUser> students)
    {
        var notifications = new List<Notification>();

        foreach (var student in students.Take(5))
        {
            notifications.Add(new Notification
            {
                UserId = student.Id,
                Title = "Welcome to Online Courses Platform!",
                Message = "Your account is ready. Start learning today!",
                Type = NotificationType.Announcement,
                IsRead = false
            });

            notifications.Add(new Notification
            {
                UserId = student.Id,
                Title = "New Course Available",
                Message = "Check out our new AI and Machine Learning courses!",
                Type = NotificationType.Announcement,
                IsRead = false
            });
        }

        await _context.Notifications.AddRangeAsync(notifications);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Seeded {Count} notifications", notifications.Count);
    }
}
