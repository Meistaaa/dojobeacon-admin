import { useMemo, useState } from "react";
import type { AxiosError } from "axios";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { uploadMdcatTest } from "../../lib/testsApi";
import type { MdcatUploadResponse } from "../../types/tests";

type FieldErrors = {
  file?: string;
  year?: string;
  duration?: string;
  form?: string;
};

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2000;
const MAX_YEAR = CURRENT_YEAR + 1;

export default function MdcatUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [result, setResult] = useState<MdcatUploadResponse["data"] | null>(null);

  const acceptedTypesText = useMemo(() => ".xlsx,.csv", []);

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const parsedYear = Number(year);
    const parsedDuration = duration ? Number(duration) : undefined;

    if (!file) {
      nextErrors.file = "File is required.";
    }

    if (!Number.isInteger(parsedYear)) {
      nextErrors.year = "Year must be an integer.";
    } else if (parsedYear < MIN_YEAR || parsedYear > MAX_YEAR) {
      nextErrors.year = `Year must be between ${MIN_YEAR} and ${MAX_YEAR}.`;
    }

    if (duration && (!Number.isInteger(parsedDuration) || Number(parsedDuration) <= 0)) {
      nextErrors.duration = "Duration must be a positive integer.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBannerError(null);
    setResult(null);

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});

      const formData = new FormData();
      if (file) formData.append("file", file);
      formData.append("year", year.trim());
      if (title.trim()) formData.append("title", title.trim());
      if (description.trim()) formData.append("description", description.trim());
      if (duration.trim()) formData.append("duration", duration.trim());

      const response = await uploadMdcatTest(formData);
      setResult(response.data);
    } catch (err) {
      const axiosError = err as AxiosError<{ message?: string }>;
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Failed to upload MD-CAT test.";

      if (status === 400) {
        const lowerMessage = message.toLowerCase();
        const nextErrors: FieldErrors = { form: message };
        if (lowerMessage.includes("year")) nextErrors.year = message;
        if (lowerMessage.includes("file") || lowerMessage.includes("header")) nextErrors.file = message;
        if (lowerMessage.includes("duration")) nextErrors.duration = message;
        setErrors(nextErrors);
      } else if (status === 409) {
        setBannerError("MD-CAT test for this year already exists.");
      } else {
        setBannerError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {bannerError ? (
        <div className="rounded-xl border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {bannerError}
        </div>
      ) : null}

      {result ? (
        <div className="rounded-xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm space-y-2">
          <p className="font-medium">Upload summary</p>
          <p>
            Year {result.year}: created {result.questionsCreated}, skipped {result.questionsSkipped}.
          </p>
          <div>
            <p className="font-medium">Skip reasons</p>
            {Object.keys(result.skipReasons).length === 0 ? (
              <p className="text-muted-foreground">No skipped questions.</p>
            ) : (
              <ul className="list-disc list-inside text-muted-foreground">
                {Object.entries(result.skipReasons).map(([reason, count]) => (
                  <li key={reason}>
                    {reason}: {count}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium">File</label>
          <Input
            type="file"
            accept={acceptedTypesText}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {errors.file ? <p className="text-sm text-destructive">{errors.file}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Year</label>
          <Input
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="e.g. 2026"
          />
          {errors.year ? <p className="text-sm text-destructive">{errors.year}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Title (optional)</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional custom title" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Description (optional)</label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Duration in minutes (optional)</label>
          <Input
            type="number"
            min={1}
            step={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 180"
          />
          {errors.duration ? <p className="text-sm text-destructive">{errors.duration}</p> : null}
        </div>

        {errors.form && !errors.file && !errors.year && !errors.duration ? (
          <p className="text-sm text-destructive">{errors.form}</p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload MD-CAT Test"}
        </Button>
      </form>
    </div>
  );
}
