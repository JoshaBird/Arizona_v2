import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import type { Submission } from "@/lib/localStorage";

const SUBMISSIONS_FILE = path.join(process.cwd(), "data", "submissions.json");

// Ensure data directory exists
async function ensureDataDirectory() {
  const dataDir = path.dirname(SUBMISSIONS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

// Read submissions from JSON file
async function readSubmissions(): Promise<Submission[]> {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(SUBMISSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Write submissions to JSON file
async function writeSubmissions(submissions: Submission[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(SUBMISSIONS_FILE, JSON.stringify(submissions, null, 2));
}

// GET - Get all submissions or search
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const searchQuery = url.searchParams.get("search");

    const submissions = await readSubmissions();

    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      const filteredSubmissions = submissions.filter(
        (sub) =>
          sub.name.toLowerCase().includes(lowercaseQuery) ||
          sub.email.toLowerCase().includes(lowercaseQuery) ||
          sub.address.toLowerCase().includes(lowercaseQuery) ||
          sub.prompt.toLowerCase().includes(lowercaseQuery)
      );
      return NextResponse.json(filteredSubmissions);
    }

    return NextResponse.json(submissions);
  } catch (error) {
    console.error("Error reading submissions:", error);
    return NextResponse.json(
      { error: "Failed to read submissions" },
      { status: 500 }
    );
  }
}

// POST - Create new submission
export async function POST(request: Request) {
  try {
    const submissionData = await request.json();

    const submissions = await readSubmissions();
    const newSubmission: Submission = {
      ...submissionData,
      id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    submissions.push(newSubmission);
    await writeSubmissions(submissions);

    return NextResponse.json(newSubmission, { status: 201 });
  } catch (error) {
    console.error("Error creating submission:", error);
    return NextResponse.json(
      { error: "Failed to create submission" },
      { status: 500 }
    );
  }
}

// PUT - Update existing submission
export async function PUT(request: Request) {
  try {
    const { id, ...updates } = await request.json();

    const submissions = await readSubmissions();
    const index = submissions.findIndex((sub) => sub.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    submissions[index] = { ...submissions[index], ...updates };
    await writeSubmissions(submissions);

    return NextResponse.json(submissions[index]);
  } catch (error) {
    console.error("Error updating submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 }
    );
  }
}

// DELETE - Delete submission
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Submission ID is required" },
        { status: 400 }
      );
    }

    const submissions = await readSubmissions();
    const filteredSubmissions = submissions.filter((sub) => sub.id !== id);

    if (filteredSubmissions.length === submissions.length) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    await writeSubmissions(filteredSubmissions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting submission:", error);
    return NextResponse.json(
      { error: "Failed to delete submission" },
      { status: 500 }
    );
  }
}
