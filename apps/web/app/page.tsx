"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Job = {
  job_id: string;
  source_url: string;
  target_language: string;
  status: string;
  created_at: string;
};

export default function HomePage() {
  const [email, setEmail] = useState("demo@streamsync.ai");
  const [password, setPassword] = useState("demo123");
  const [token, setToken] = useState("");
  const [url, setUrl] = useState("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  const [language, setLanguage] = useState("ro");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const api = useMemo(
    () => async (path: string, init: RequestInit = {}) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(init.headers as Record<string, string> | undefined)
      };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(path, { ...init, headers });
      return response;
    },
    [token]
  );

  async function login() {
    setError("");
    setLoading(true);
    try {
      const response = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Login failed");
      const data = await response.json();
      setToken(data.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const loadJobs = useCallback(async () => {
    if (!token) return;
    const response = await api("/api/jobs");
    if (!response.ok) return;
    const data = await response.json();
    setJobs(data);
  }, [token, api]);

  async function createJob() {
    setError("");
    setLoading(true);
    try {
      const response = await api("/api/jobs/create", {
        method: "POST",
        body: JSON.stringify({ source_url: url, target_language: language })
      });
      if (!response.ok) throw new Error("Failed to create job");
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteJob(jobId: string) {
    const response = await api(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (response.ok) {
      await loadJobs();
    }
  }

  async function downloadSubtitles(jobId: string, format: "srt" | "vtt") {
    setError("");
    try {
      const response = await api(`/api/jobs/${jobId}/subtitles?format=${format}`, {
        headers: {}
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Download failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${jobId}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    }
  }

  useEffect(() => {
    if (!token) return;
    loadJobs();
    const id = setInterval(loadJobs, 4000);
    return () => clearInterval(id);
  }, [token, loadJobs]);

  return (
    <main>
      <h1>StreamSync AI</h1>
      <p>
        Submit a video URL, process subtitles asynchronously, and download .srt/.vtt when completed.
      </p>

      <div className="card">
        <h3>1) Authenticate</h3>
        <div className="row">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
          />
        </div>
        <button onClick={login} disabled={loading}>
          Login
        </button>
        <small>{token ? "Authenticated" : "Not authenticated"}</small>
      </div>

      <div className="card">
        <h3>2) Create Job</h3>
        <div className="row">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Video URL" />
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="ro">Romanian</option>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <button onClick={createJob} disabled={!token || loading}>
          Submit URL
        </button>
      </div>

      <div className="card">
        <h3>3) Jobs</h3>
        {jobs.length === 0 && <small>No jobs yet</small>}
        {jobs.map((job) => (
          <div key={job.job_id} className="card" style={{ marginBottom: "0.6rem" }}>
            <div>
              <strong>{job.status}</strong> - {job.target_language}
            </div>
            <small>{job.source_url}</small>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <button
                className="secondary"
                disabled={job.status !== "COMPLETED"}
                onClick={() => downloadSubtitles(job.job_id, "srt")}
              >
                Download SRT
              </button>
              <button
                className="secondary"
                disabled={job.status !== "COMPLETED"}
                onClick={() => downloadSubtitles(job.job_id, "vtt")}
              >
                Download VTT
              </button>
              <button className="secondary" onClick={() => deleteJob(job.job_id)}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && <p style={{ color: "#ffadad" }}>{error}</p>}
    </main>
  );
}
