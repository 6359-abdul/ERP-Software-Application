import React, { useState } from "react";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";

export type Page =
  | "dashboard"
  | "profile"
  | "fee"
  | "fee-type"
  | "class-fee-structure"
  | "assign-special-fee"
  | "fee-installments"
  | "take-fee"
  | "administration"
  | "academic"
  | "academics"
  | "setup"
  | "classes-management"
  | "student-attendance"
  | "student-administration"
  | "concession-master"
  | "student-concession"
  | "update-student-fee-structure"
  | "create-student"
  | "import-student-data"
  | "fee-reports"
  | "attendance-report"
  | "configuration";

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('token');
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      )}
    </>
  );
};

export default App;
