import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect
} from "react";

import { Student, FeeInstallment } from "../types";
import api from "../api";

// ------------------
// Context Types
// ------------------
interface SchoolContextType {
  students: Student[];
  loading: boolean;
  error: string | null;
  addStudent: (
    student: Omit<Student, "sr" | "feeInstallments"> & {
      feeInstallments?: FeeInstallment[];
    }
  ) => Promise<void>;
  updateStudent: (
    admNo: string,
    updatedData: Partial<Student>
  ) => Promise<void>;
}

// ------------------
// Create Context
// ------------------
const SchoolContext = createContext<SchoolContextType | undefined>(undefined);

 // ------------------
 // Default Fee Installments
 // ------------------
 // In production, fee installments must come from backend (StudentFee/FeeInstallment),
 // so we keep this as an empty fallback.
 const getDefaultInstallments = (): FeeInstallment[] => [];

// ------------------
// Provider
// ------------------
export const SchoolProvider: React.FC<{ children: ReactNode }> = ({
  children
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);

    api.get(`/students`)
      .then((res) => {
        setStudents(res.data.students || []);
        setError(null);
      })
      .catch(() => setError("Failed to load student data"))
      .finally(() => setLoading(false));
  }, []);


  const addStudent = async (
    newStudent: Omit<Student, "sr" | "feeInstallments"> & {
      feeInstallments?: FeeInstallment[];
    }
  ) => {
    setStudents(prev => {
      const newSr = prev.length
        ? Math.max(...prev.map(s => s.sr)) + 1
        : 1;

      return [
        {
          ...newStudent,
          sr: newSr,
          feeInstallments:
            newStudent.feeInstallments || getDefaultInstallments()
        },
        ...prev
      ];
    });
  };

  const updateStudent = async (
    admNo: string,
    updatedData: Partial<Student>
  ) => {
    setStudents(prev =>
      prev.map(s => (s.admNo === admNo ? { ...s, ...updatedData } : s))
    );
  };

  return (
    <SchoolContext.Provider
      value={{ students, loading, error, addStudent, updateStudent }}
    >
      {children}
    </SchoolContext.Provider>
  );
};

// ------------------
// Custom Hook
// ------------------
export const useSchool = (): SchoolContextType => {
  const context = useContext(SchoolContext);
  if (!context) throw new Error("useSchool must be used inside SchoolProvider");
  return context;
};
