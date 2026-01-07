# 🎓 Git Academy - Learning Management System (LMS)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![.NET](https://img.shields.io/badge/.NET-9.0-purple)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen)

**Git Academy** is a comprehensive, full-stack Learning Management System designed to bridge the gap between students and instructors. Built with a robust **.NET Clean Architecture** backend and a modern **React + TypeScript** frontend, it features real-time communication, secure payments, and extensive course management capabilities.

---

## ✨ Key Features

* **📚 Course Management:** create, browse, and enroll in courses with rich media content.
* **📝 Quizzes & Assignments:** interactive quiz engine and assignment submission system with grading support.
* **💬 Real-Time Chat:** integrated messaging system for students and instructors using **SignalR**.
* **🔔 Live Notifications:** instant updates for grades, new assignments, and messages.
* **💳 Secure Payments:** seamless payment processing via **Stripe** integration.
* **📊 Gradebook:** comprehensive grading system for tracking student progress.
* **🔐 Role-Based Security:** secure authentication and authorization (Admin, Instructor, Student).
* **📂 File Management:** upload and manage course resources (PDFs, Videos).

---

## 🛠️ Technology Stack

### **Backend (.NET)**
* **Framework:** ASP.NET Core Web API (.NET 8)
* **Architecture:** Clean Architecture (Domain, Application, Infrastructure, Presentation)
* **Database:** SQL Server (via Entity Framework Core)
* **Real-time:** SignalR (Chat & Notifications)
* **Identity:** JWT Authentication & Role-based Authorization

### **Frontend (React)**
* **Framework:** React (Vite)
* **Language:** TypeScript
* **State Management:** Context API / Hooks
* **Styling:** CSS / Tailwind (Adjust based on your setup)
* **HTTP Client:** Axios / Fetch

---

## 📂 Project Structure

The solution follows strict **Clean Architecture** principles:

```text
├── src/
│   ├── Sms.Domain/          # Enterprise logic, Entities, Enums (No dependencies)
│   ├── Sms.Application/     # Business logic, DTOs, Interfaces, Services
│   ├── Sms.Infrastructure/  # Database, External Services (Stripe, Email), Repositories
│   ├── Sms.WebApi/          # API Controllers, SignalR Hubs, Entry Point
│   └── sms-frontend/        # React Client Application
└── tests/                   # Unit and Integration Tests
