/**
 * Local Storage utilities for handling submissions data
 *
 * This replaces database storage with browser localStorage
 * for a simpler frontend-only approach
 */

export interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  prompt: string;
  originalImageUrl?: string;
  resultImageUrl?: string;
  createdAt: string;
}

const STORAGE_KEY = "oak_iron_submissions";

/**
 * Save a submission to localStorage
 */
export function saveSubmission(
  submission: Omit<Submission, "id" | "createdAt">
): Submission {
  const submissions = getSubmissions();
  const newSubmission: Submission = {
    ...submission,
    id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  submissions.push(newSubmission);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));

  return newSubmission;
}

/**
 * Get all submissions from localStorage
 */
export function getSubmissions(): Submission[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading submissions from localStorage:", error);
    return [];
  }
}

/**
 * Get a specific submission by ID
 */
export function getSubmissionById(id: string): Submission | null {
  const submissions = getSubmissions();
  return submissions.find((sub) => sub.id === id) || null;
}

/**
 * Update a submission in localStorage
 */
export function updateSubmission(
  id: string,
  updates: Partial<Submission>
): Submission | null {
  const submissions = getSubmissions();
  const index = submissions.findIndex((sub) => sub.id === id);

  if (index === -1) {
    return null;
  }

  submissions[index] = { ...submissions[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));

  return submissions[index];
}

/**
 * Delete a submission from localStorage
 */
export function deleteSubmission(id: string): boolean {
  const submissions = getSubmissions();
  const filtered = submissions.filter((sub) => sub.id !== id);

  if (filtered.length === submissions.length) {
    return false; // No submission found
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Clear all submissions from localStorage
 */
export function clearSubmissions(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Export submissions as JSON
 */
export function exportSubmissions(): string {
  const submissions = getSubmissions();
  return JSON.stringify(submissions, null, 2);
}

/**
 * Import submissions from JSON
 */
export function importSubmissions(json: string): boolean {
  try {
    const submissions = JSON.parse(json);
    if (Array.isArray(submissions)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions));
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error importing submissions:", error);
    return false;
  }
}

/**
 * Get submissions count
 */
export function getSubmissionsCount(): number {
  return getSubmissions().length;
}

/**
 * Search submissions by text
 */
export function searchSubmissions(query: string): Submission[] {
  const submissions = getSubmissions();
  const lowercaseQuery = query.toLowerCase();

  return submissions.filter(
    (sub) =>
      sub.name.toLowerCase().includes(lowercaseQuery) ||
      sub.email.toLowerCase().includes(lowercaseQuery) ||
      sub.address.toLowerCase().includes(lowercaseQuery) ||
      sub.prompt.toLowerCase().includes(lowercaseQuery)
  );
}
