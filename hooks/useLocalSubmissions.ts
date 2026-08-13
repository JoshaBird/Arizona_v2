import { useState, useEffect, useCallback } from "react";
import {
  saveSubmission,
  getSubmissions,
  getSubmissionById,
  updateSubmission,
  deleteSubmission,
  clearSubmissions,
  getSubmissionsCount,
  searchSubmissions,
  type Submission,
} from "@/lib/localStorage";

export function useLocalSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load submissions from localStorage
  const loadSubmissions = useCallback(() => {
    try {
      const storedSubmissions = getSubmissions();
      setSubmissions(storedSubmissions);
      setError(null);
    } catch (err) {
      setError("Failed to load submissions");
      console.error("Error loading submissions:", err);
    }
  }, []);

  // Save a new submission
  const saveNewSubmission = useCallback(
    (submissionData: Omit<Submission, "id" | "createdAt">) => {
      try {
        setLoading(true);
        const newSubmission = saveSubmission(submissionData);
        setSubmissions((prev) => [...prev, newSubmission]);
        setError(null);
        return newSubmission;
      } catch (err) {
        setError("Failed to save submission");
        console.error("Error saving submission:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Update an existing submission
  const updateExistingSubmission = useCallback(
    (id: string, updates: Partial<Submission>) => {
      try {
        setLoading(true);
        const updated = updateSubmission(id, updates);
        if (updated) {
          setSubmissions((prev) =>
            prev.map((sub) => (sub.id === id ? updated : sub))
          );
          setError(null);
        }
        return updated;
      } catch (err) {
        setError("Failed to update submission");
        console.error("Error updating submission:", err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Delete a submission
  const deleteExistingSubmission = useCallback((id: string) => {
    try {
      setLoading(true);
      const success = deleteSubmission(id);
      if (success) {
        setSubmissions((prev) => prev.filter((sub) => sub.id !== id));
        setError(null);
      }
      return success;
    } catch (err) {
      setError("Failed to delete submission");
      console.error("Error deleting submission:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all submissions
  const clearAllSubmissions = useCallback(() => {
    try {
      setLoading(true);
      clearSubmissions();
      setSubmissions([]);
      setError(null);
    } catch (err) {
      setError("Failed to clear submissions");
      console.error("Error clearing submissions:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get submission by ID
  const getSubmission = useCallback((id: string) => {
    try {
      return getSubmissionById(id);
    } catch (err) {
      setError("Failed to get submission");
      console.error("Error getting submission:", err);
      return null;
    }
  }, []);

  // Search submissions
  const searchSubmissionsByQuery = useCallback((query: string) => {
    try {
      return searchSubmissions(query);
    } catch (err) {
      setError("Failed to search submissions");
      console.error("Error searching submissions:", err);
      return [];
    }
  }, []);

  // Get submissions count
  const count = useCallback(() => {
    try {
      return getSubmissionsCount();
    } catch (err) {
      console.error("Error getting submissions count:", err);
      return 0;
    }
  }, []);

  // Load submissions on mount
  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  return {
    submissions,
    loading,
    error,
    saveSubmission: saveNewSubmission,
    updateSubmission: updateExistingSubmission,
    deleteSubmission: deleteExistingSubmission,
    getSubmission,
    clearSubmissions: clearAllSubmissions,
    searchSubmissions: searchSubmissionsByQuery,
    count,
    refresh: loadSubmissions,
  };
}
