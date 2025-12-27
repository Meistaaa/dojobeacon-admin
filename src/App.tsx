import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { LayoutDashboard, BookOpen, Layers, Users, ListChecks } from "lucide-react";
import DashboardPage from "./pages/DashboardPage";
import SubjectsPage from "./pages/SubjectsPage";
import ChaptersPage from "./pages/ChaptersPage";
import TestsPage from "./pages/TestsPage";
import UsersPage from "./pages/UsersPage";
import LoginPage from "./pages/LoginPage";
import QuestionsPage from "./pages/QuestionsPage";
import "./index.css";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const navItems = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/subjects", label: "Subjects", icon: BookOpen },
    { to: "/chapters", label: "Chapters", icon: Layers },
    { to: "/tests", label: "Tests", icon: ListChecks },
    { to: "/questions", label: "Questions", icon: ListChecks },
    { to: "/users", label: "Users", icon: Users },
  ];

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-background text-foreground flex">
              <aside className="w-64 bg-sidebar-background border-r border-sidebar-border hidden md:flex flex-col">
                <div className="px-6 py-5 border-b border-sidebar-border">
                  <p className="text-lg font-semibold text-sidebar-foreground">SmarterCat Admin</p>
                  <p className="text-xs text-muted-foreground mt-1">Control panel</p>
                </div>
                <nav className="flex-1 px-2 py-4 space-y-1">
                  {navItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{label}</span>
                    </NavLink>
                  ))}
                </nav>
              </aside>

              <main className="flex-1">
                <header className="md:hidden border-b border-border px-4 py-3">
                  <p className="text-base font-semibold">SmarterCat Admin</p>
                </header>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route
                      path="/dashboard"
                      element={
                        <ProtectedRoute>
                          <DashboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/subjects"
                      element={
                        <ProtectedRoute>
                          <SubjectsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/chapters"
                      element={
                        <ProtectedRoute>
                          <ChaptersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/tests"
                      element={
                        <ProtectedRoute>
                          <TestsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/questions"
                      element={
                        <ProtectedRoute>
                          <QuestionsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/users"
                      element={
                        <ProtectedRoute>
                          <UsersPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          }
        />
      </Routes>
    </Router>
  );
}
