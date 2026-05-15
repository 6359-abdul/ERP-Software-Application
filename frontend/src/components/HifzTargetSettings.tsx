import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X } from "lucide-react";
import api from "../api";

interface Program {
  id: number;
  program_name: string;
  total_months: number;
  total_paras: number;
}

const HifzTargetSettings: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    program_name: "",
    total_months: "",
    total_paras: ""
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const res = await api.get("/hifz/programs");
      setPrograms(res.data);
      if (!selectedProgram && res.data.length > 0) {
        handleSelectProgram(res.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const handleSelectProgram = (prog: Program) => {
    setSelectedProgram(prog);
    setIsCreating(false);
    setFormData({
      program_name: prog.program_name,
      total_months: prog.total_months.toString(),
      total_paras: prog.total_paras.toString()
    });
    setMessage(null);
  };

  const handleCreateNew = () => {
    setSelectedProgram(null);
    setIsCreating(true);
    setFormData({
      program_name: "",
      total_months: "24",
      total_paras: "30"
    });
    setMessage(null);
  };

  const handleSave = async () => {
    if (!formData.program_name || !formData.total_months || !formData.total_paras) {
      setMessage({ type: "error", text: "All fields are required." });
      return;
    }

    const months = parseInt(formData.total_months);
    const paras = parseInt(formData.total_paras);

    if (isNaN(months) || isNaN(paras)) {
      setMessage({ type: "error", text: "Months and Paras must be valid numbers." });
      return;
    }

    if (months <= 0 || paras <= 0) {
      setMessage({ type: "error", text: "Months and Paras must be positive numbers." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        program_name: formData.program_name,
        total_months: months,
        total_paras: paras
      };

      if (isCreating) {
        await api.post("/hifz/programs", payload);
        setMessage({ type: "success", text: "Target Level created successfully!" });
      } else if (selectedProgram) {
        await api.put(`/hifz/programs/${selectedProgram.id}`, payload);
        setMessage({ type: "success", text: "Target Level updated successfully!" });
      }
      await fetchPrograms();
      setIsCreating(false);
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Error saving." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProgram) return;
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.delete(`/hifz/programs/${selectedProgram.id}`);
      setMessage({ type: "success", text: "Category deleted." });
      setSelectedProgram(null);
      await fetchPrograms();
    } catch (err: any) {
      setMessage({ type: "error", text: "Error deleting category." });
    } finally {
      setSaving(false);
    }
  };

  // Generate preview table
  const previewMonths = parseInt(formData.total_months) || 24;
  const previewParas = parseInt(formData.total_paras) || 30;
  const pace = previewParas / previewMonths;

  const previewData = [];
  for (let m = 0; m <= previewMonths; m++) {
    previewData.push({
      month: m,
      expected: Math.min(Number((pace * m).toFixed(1)), previewParas)
    });
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hifz Target Level Master</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left sidebar: Categories List */}
        <div className="w-full md:w-1/4 bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <h2 className="font-semibold text-gray-700">Categories</h2>
            <button
              onClick={handleCreateNew}
              className="text-blue-600 hover:text-blue-800 p-1"
              title="Add New Category"
              aria-label="Add New Category"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <ul className="space-y-2">
              {programs.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => handleSelectProgram(p)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedProgram?.id === p.id && !isCreating
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                      }`}
                  >
                    {p.program_name}
                  </button>
                </li>
              ))}
              {programs.length === 0 && !isCreating && (
                <p className="text-xs text-gray-500 text-center py-4">No categories found.</p>
              )}
            </ul>
          )}
        </div>

        {/* Right content: Form & Preview */}
        <div className="w-full md:w-3/4">
          {(selectedProgram || isCreating) ? (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-semibold text-gray-800">
                    {isCreating ? "Create New Target Category" : "Edit Target Category"}
                  </h2>
                  {!isCreating && (
                    <button
                      onClick={handleDelete}
                      className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>

                {message && (
                  <div className={`p-3 rounded-md mb-4 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.text}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                    <input
                      type="text"
                      value={formData.program_name}
                      onChange={e => setFormData({ ...formData, program_name: e.target.value })}
                      placeholder="e.g. Hifz + Nazira"
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Target Months</label>
                    <input
                      type="number"
                      value={formData.total_months}
                      onChange={e => setFormData({ ...formData, total_months: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Target Paras</label>
                    <input
                      type="number"
                      value={formData.total_paras}
                      onChange={e => setFormData({ ...formData, total_paras: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  {isCreating && (
                    <button
                      onClick={() => setIsCreating(false)}
                      className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Category"}
                  </button>
                </div>
              </div>

              {/* Live Preview Table */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-md font-semibold text-gray-800 mb-4">Standard Graph Preview</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Based on your settings, students in this category are expected to complete <strong className="text-blue-600">{pace.toFixed(2)} paras per month</strong>.
                  This standard line will be drawn on their report card.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Month</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Expected Paras Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice(0, 7).map(row => (
                        <tr key={row.month} className="border-b">
                          <td className="px-4 py-2">Month {row.month}</td>
                          <td className="px-4 py-2 font-medium">{row.expected}</td>
                        </tr>
                      ))}
                      {previewData.length > 7 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-2 text-center text-gray-400">
                            ... {previewData.length - 8} more months ...
                          </td>
                        </tr>
                      )}
                      {previewData.length > 0 && (
                        <tr className="border-b bg-blue-50/30">
                          <td className="px-4 py-2">Month {previewData[previewData.length - 1].month} (Final)</td>
                          <td className="px-4 py-2 font-bold text-blue-700">{previewData[previewData.length - 1].expected}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center h-64 text-gray-500">
              Select a category or create a new one to view settings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HifzTargetSettings;
