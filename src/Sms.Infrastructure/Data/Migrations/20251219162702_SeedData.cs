using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Sms.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class SeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AspNetUsers_ProfessorId",
                table: "Subjects");

            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AspNetUsers_TeachingAssistantId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_TeachingAssistantId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "TeachingAssistantId",
                table: "Subjects");

            migrationBuilder.RenameColumn(
                name: "ProfessorId",
                table: "Subjects",
                newName: "InstructorId");

            migrationBuilder.RenameIndex(
                name: "IX_Subjects_ProfessorId",
                table: "Subjects",
                newName: "IX_Subjects_InstructorId");

            migrationBuilder.AddColumn<decimal>(
                name: "Price",
                table: "Subjects",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AspNetUsers_InstructorId",
                table: "Subjects",
                column: "InstructorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_AspNetUsers_InstructorId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Price",
                table: "Subjects");

            migrationBuilder.RenameColumn(
                name: "InstructorId",
                table: "Subjects",
                newName: "ProfessorId");

            migrationBuilder.RenameIndex(
                name: "IX_Subjects_InstructorId",
                table: "Subjects",
                newName: "IX_Subjects_ProfessorId");

            migrationBuilder.AddColumn<Guid>(
                name: "TeachingAssistantId",
                table: "Subjects",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_TeachingAssistantId",
                table: "Subjects",
                column: "TeachingAssistantId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AspNetUsers_ProfessorId",
                table: "Subjects",
                column: "ProfessorId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_AspNetUsers_TeachingAssistantId",
                table: "Subjects",
                column: "TeachingAssistantId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
