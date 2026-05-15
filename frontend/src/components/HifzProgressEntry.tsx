import React, { useState, useEffect } from "react";
import { Search, Save } from "lucide-react";
import api from "../api";
interface HifzStudent {
  student_id: number;
  admission_no: string;
  student_name: string;
  class_name: string;
  section: string;
  roll_number: string;
  category: string;
  completed_months: number | "";
  completed_paras: number | "";
}

const HifzProgressEntry: React.FC = () => {
  const userStr = localStorage.getItem("user");
  let defaultBranch = "";
  let user = null;
  if (userStr) {
    try {
      user = JSON.parse(userStr);
      if (user.role === 'Admin' || user.branch === 'All' || user.branch === 'AllBranches' || user.branch === 'All Branches') {
        const selected = localStorage.getItem("currentBranch");
        if (selected && selected !== "All" && selected !== "All Locations") {
          defaultBranch = selected;
        } else {
          defaultBranch = "Murad Nagar";
        }
      } else {
        defaultBranch = user.branch || "";
      }
    } catch (e) {
      console.error("Error parsing user", e);
    }
  }

  const [filters, setFilters] = useState({
    branch: defaultBranch,
    className: "",
    section: "",
    category: "",
    test_id: ""
  });

  const [classes, setClasses] = useState<{ id: number, class_name: string }[]>([]);
  const [sections, setSections] = useState<{ section: string }[]>([]);
  const [tests, setTests] = useState<{ test_id: number, test_name: string }[]>([]);
  const [branches, setBranches] = useState<{ branch_code: string, branch_name: string }[]>([]);

  const [students, setStudents] = useState<HifzStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Categories list
  const categories = ["Hifz", "Hifz + Nazira"];

  // Fetch branches
  useEffect(() => {
    if (user?.role === 'Admin' || user?.branch === 'All Branches' || user?.branch === 'All') {
      api.get("/branches")
        .then(res => {
          if (res.data && res.data.branches) {
            setBranches(res.data.branches);
          }
        })
        .catch(err => console.error("Error fetching branches:", err));
    } else if (user?.branch) {
      setBranches([{ branch_code: user.branch, branch_name: user.branch }]);
    }
  }, []);

  // Fetch classes
  useEffect(() => {
    if (filters.branch && filters.branch !== "All" && filters.branch !== "All Branches") {
      api.get(`/classes?branch=${filters.branch}`)
        .then(res => setClasses(res.data.classes || res.data))
        .catch(() => setClasses([]));
    }
  }, [filters.branch]);

  // Fetch sections and tests when class changes
  useEffect(() => {
    if (filters.className) {
      api.get(`/sections?class=${filters.className}`)
        .then(res => setSections(res.data.sections || res.data || []))
        .catch(() => setSections([]));

      // Fetch tests for this class
      const clsObj = classes.find(c => c.class_name === filters.className);
      if (clsObj) {
        api.get(`/class-tests/list`, {
          params: {
            academic_year: localStorage.getItem("academicYear") || "2024-2025",
            branch: filters.branch,
            class_id: clsObj.id
          }
        })
          .then(res => setTests(res.data || []))
          .catch(() => setTests([]));
      }
    } else {
      setSections([]);
      setTests([]);
      setFilters(prev => ({ ...prev, test_id: "" }));
    }
  }, [filters.className, filters.branch, classes]);

  const fetchStudents = async () => {
    if (!filters.branch || !filters.className || !filters.section || !filters.category) {
      setMessage({ type: "error", text: "Please select Branch, Class, Section, and Category." });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await api.get("/hifz/students", {
        params: {
          branch: filters.branch,
          class_name: filters.className,
          section: filters.section,
          category: filters.category,
          test_id: filters.test_id
        }
      });
      setStudents(res.data || []);
      if (res.data.length === 0) {
        setMessage({ type: "success", text: "No students found in this category." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Error fetching students." });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (studentId: number, field: "completed_months" | "completed_paras", value: string) => {
    setStudents(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return {
          ...s,
          [field]: value === "" ? "" : (field === "completed_months" ? parseInt(value) : parseFloat(value))
        };
      }
      return s;
    }));
  };

  const handleSaveAll = async () => {
    if (students.length === 0) return;
    setSaving(true);
    setMessage(null);

    try {
      await api.post("/hifz/bulk-progress", {
        entries: students,
        test_id: filters.test_id ? parseInt(filters.test_id) : null
      });
      setMessage({ type: "success", text: "Progress saved successfully!" });
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to save progress." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hifz Progress Entry</h1>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
            <select
              value={filters.branch}
              onChange={(e) => setFilters({ ...filters, branch: e.target.value, className: "", section: "" })}
              disabled={user?.role !== 'Admin' && user?.branch !== "All Branches" && user?.branch !== "All"}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            >
              <option value="">Select Branch</option>
              {branches.map(b => (
                <option key={b.branch_code || b.branch_name} value={b.branch_name}>
                  {b.branch_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Class</label>
            <select
              value={filters.className}
              onChange={(e) => setFilters({ ...filters, className: e.target.value, section: "" })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.class_name}>{c.class_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select
              value={filters.section}
              onChange={(e) => setFilters({ ...filters, section: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            >
              <option value="">Select Section</option>
              {sections.map((s: any) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Test Type (Optional)</label>
            <select
              value={filters.test_id}
              onChange={(e) => setFilters({ ...filters, test_id: e.target.value })}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 border"
            >
              <option value="">Select Test Type</option>
              {tests.map((t: any) => (
                <option key={t.test_id} value={t.test_id}>{t.test_name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-1 lg:col-span-1 pt-4">
            <button
              onClick={fetchStudents}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Search className="w-4 h-4" /> {loading ? "Loading..." : "Search"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Student List */}
      {students.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-700">Enter Progress</h2>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">S.No</th>
                  <th className="px-4 py-3">Admission No</th>
                  <th className="px-4 py-3">Student Name</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Sec</th>
                  <th className="px-4 py-3">Roll</th>
                  <th className="px-4 py-3">Academic Category</th>
                  <th className="px-4 py-3 text-center bg-blue-50">No of Paras</th>
                  <th className="px-4 py-3 text-center bg-blue-50">No of Months</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {students.map((student, idx) => (
                  <tr key={student.student_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{student.admission_no}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{student.student_name}</td>
                    <td className="px-4 py-3">{student.class_name}</td>
                    <td className="px-4 py-3">{student.section}</td>
                    <td className="px-4 py-3">{student.roll_number}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        {student.category}
                      </span>
                    </td>
                    <td className="px-4 py-2 bg-blue-50/30">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="30"
                        value={student.completed_paras}
                        onChange={(e) => handleInputChange(student.student_id, "completed_paras", e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-center mx-auto block focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                    <td className="px-4 py-2 bg-blue-50/30">
                      <input
                        type="number"
                        min="0"
                        value={student.completed_months}
                        onChange={(e) => handleInputChange(student.student_id, "completed_months", e.target.value)}
                        className="w-20 px-2 py-1 border rounded text-center mx-auto block focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default HifzProgressEntry;
