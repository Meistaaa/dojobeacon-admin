import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import PageHeader from "../components/PageHeader";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { apiFetch } from "../lib/api";
import api from "../lib/axiosInstance";
import { Loader2, Pencil, Plus, Trash2, Eye, RefreshCw, X, Check } from "lucide-react";

type BlogStatus = "draft" | "published";

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  coverImage?: string;
  tags?: string[];
  status: BlogStatus;
  author?: { _id: string; email: string; role?: string };
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  viewCount?: number;
  estimatedReadMinutes?: number;
};

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  tags: string;
  status: BlogStatus;
};

type BlogListResponse =
  | BlogPost[]
  | {
      success?: boolean;
      data?: BlogPost[];
      meta?: { page: number; limit: number; total: number };
    };

type BlogImageUploadData = {
  path?: string;
  publicUrl?: string;
};

const blogEditorToolbar = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "blockquote", "code-block", "image"],
  ["clean"],
];

const buildDefaultImageFolder = (slug?: string) =>
  slug ? `blogs/${slug}` : "blogs";

const initialForm: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  tags: "",
  status: "draft",
};

const MAX_TABLE_TAGS = 3;

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selected, setSelected] = useState<BlogPost | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | BlogStatus>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<BlogForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [coverUploadSuccess, setCoverUploadSuccess] = useState<string | null>(
    null,
  );
  const quillWrapperRef = useRef<HTMLDivElement | null>(null);
  const quillInstanceRef = useRef<Quill | null>(null);
  const lastQuillHtmlRef = useRef("");
  const quillImageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageFolder, setImageFolder] = useState(buildDefaultImageFolder());
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [imageUploadSuccess, setImageUploadSuccess] = useState<string | null>(
    null,
  );

  const resetUploadStates = () => {
    setCoverUploadError(null);
    setCoverUploadSuccess(null);
    setImageUploadError(null);
    setImageUploadSuccess(null);
  };

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tagFilter, pageSize]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: pageSize,
        search: search.trim() || undefined,
        tag: tagFilter.trim() || undefined,
        status: statusFilter === "all" ? "all" : statusFilter,
        includeDrafts: "true",
        sort: "desc",
      };

      const res = await api.get<BlogListResponse>("/blog", { params });
      const payload = res.data;
      const postsData: BlogPost[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      const meta = Array.isArray(payload) ? undefined : payload?.meta;

      setPosts(postsData);
      setSelected((prev) => {
        if (!postsData.length) return null;
        if (prev) {
          const match = postsData.find((p) => p._id === prev._id);
          if (match) return match;
        }
        return postsData[0];
      });
      const totalCount = meta?.total ?? postsData.length;
      setTotal(totalCount);

      if (totalCount > 0 && postsData.length === 0 && page > 1) {
        setPage((prev) => Math.max(1, prev - 1));
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load blog posts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, tagFilter]);

  const openCreateModal = () => {
    resetUploadStates();
    setCoverUploading(false);
    setImageUploading(false);
    setForm(initialForm);
    setEditingId(null);
    setImageFolder(buildDefaultImageFolder());
    setShowModal(true);
  };

  const openEditModal = (post: BlogPost) => {
    resetUploadStates();
    setCoverUploading(false);
    setImageUploading(false);
    setEditingId(post._id);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
      coverImage: post.coverImage || "",
      tags: (post.tags || []).join(", "),
      status: post.status || "draft",
    });
    setImageFolder(buildDefaultImageFolder(post.slug));
    setShowModal(true);
  };

  useEffect(() => {
    if (!showModal || !quillWrapperRef.current) return;
    quillWrapperRef.current.innerHTML = "";
    const editorEl = document.createElement("div");
    quillWrapperRef.current.appendChild(editorEl);
    const quill = new Quill(editorEl, {
      theme: "snow",
      modules: {
        toolbar: {
          container: blogEditorToolbar,
          handlers: {
            image: () => {
              quillImageInputRef.current?.click();
            },
          },
        },
      },
    });
    quill.root.innerHTML = form.content || "";
    lastQuillHtmlRef.current = form.content || "";

    const handler = () => {
      const html = quill.root.innerHTML;
      if (html !== lastQuillHtmlRef.current) {
        lastQuillHtmlRef.current = html;
        setForm((prev) => ({ ...prev, content: html }));
      }
    };
    quill.on("text-change", handler);
    quillInstanceRef.current = quill;

    return () => {
      quill.off("text-change", handler);
      quillInstanceRef.current = null;
      if (quillWrapperRef.current) {
        quillWrapperRef.current.innerHTML = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  useEffect(() => {
    const quill = quillInstanceRef.current;
    if (!quill) return;
    if (form.content !== lastQuillHtmlRef.current) {
      quill.root.innerHTML = form.content || "";
      lastQuillHtmlRef.current = form.content || "";
    }
  }, [form.content]);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Title and content are required");
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      content: form.content.trim(),
      coverImage: form.coverImage.trim() || undefined,
      status: form.status,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    };

    try {
      setSaving(true);
      setError(null);
      if (editingId) {
        await api.put(`/blog/${editingId}`, payload);
      } else {
        await api.post("/blog", payload);
      }
      await loadPosts();
      setShowModal(false);
      setEditingId(null);
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  const uploadBlogCoverImage = async (file?: File) => {
    if (!file) return;
    setCoverUploadError(null);
    setCoverUploadSuccess(null);
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "blogs");

      const payload = await apiFetch<BlogImageUploadData>(
        "/blog/upload-image",
        {
          method: "POST",
          data: formData,
        },
      );
      const publicUrl = payload?.publicUrl;

      if (!publicUrl) {
        throw new Error("Upload succeeded but no public URL returned.");
      }

      setForm((prev) => ({ ...prev, coverImage: publicUrl }));
      setCoverUploadSuccess(`Uploaded ${file.name}`);
    } catch (err) {
      console.error("Cover image upload failed", err);
      setCoverUploadError(
        err instanceof Error ? err.message : "Unable to upload image",
      );
    } finally {
      setCoverUploading(false);
    }
  };

  const uploadQuillImage = async (file: File) => {
    setImageUploadError(null);
    setImageUploadSuccess(null);
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "folder",
        imageFolder.trim() || buildDefaultImageFolder(),
      );

      const payload = await apiFetch<BlogImageUploadData>(
        "/blog/upload-image",
        {
          method: "POST",
          data: formData,
        },
      );
      const publicUrl = payload?.publicUrl;

      if (!publicUrl) {
        throw new Error("Upload succeeded but no public URL was returned.");
      }

      setImageUploadSuccess("Image added to content");
      return publicUrl;
    } catch (err) {
      console.error("Editor image upload failed", err);
      setImageUploadError(
        err instanceof Error ? err.message : "Unable to upload image",
      );
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  const handleQuillImageInputChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) {
      event.target.value = "";
      return;
    }

    const imageUrl = await uploadQuillImage(file);
    if (imageUrl && quillInstanceRef.current) {
      const quill = quillInstanceRef.current;
      const range = quill.getSelection(true);
      const insertIndex = range?.index ?? quill.getLength();
      quill.insertEmbed(insertIndex, "image", imageUrl, "user");
      quill.setSelection(insertIndex + 1, 0, "silent");
    }

    event.target.value = "";
  };

  const handleCoverImageInputChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      void uploadBlogCoverImage(file);
    }
    event.target.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this blog post?")) return;
    try {
      await api.delete(`/blog/${id}`);
      await loadPosts();
    } catch (err) {
      console.error(err);
      setError("Failed to delete blog post");
    }
  };

  const statusBadge = (status: BlogStatus) =>
    status === "published" ? (
      <Badge className="bg-green-100 text-green-800">Published</Badge>
    ) : (
      <Badge variant="secondary">Draft</Badge>
    );

  const handleSlugSync = () => {
    if (form.title) {
      const generated = form.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();
      setForm((p) => ({ ...p, slug: generated }));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog"
        description="Create, edit, publish, and archive blog posts."
        action={
          <Button size="sm" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            <span className="ml-2">New Post</span>
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Filters</CardTitle>
          <CardDescription>
            Search posts, filter by status or tag.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <Input
            placeholder="Search title or content"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            placeholder="Tag (e.g. updates)"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
          />
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as BlogStatus | "all")
            }
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value) || 10)}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-accent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card className="h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg">Posts</CardTitle>
                <CardDescription>{total} total</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadPosts}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-auto rounded-xl border border-border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="px-3 py-2 w-[28%]">Title</th>
                      <th className="px-3 py-2 w-[12%]">Status</th>
                      <th className="px-3 py-2 w-[38%]">Tags</th>
                      <th className="px-3 py-2 w-[10%]">Published</th>
                      <th className="px-3 py-2 w-[6%] text-right">Views</th>
                      <th className="px-3 py-2 w-36 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post._id} className="border-t border-border/70">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="line-clamp-2 text-left font-medium hover:underline"
                            onClick={() => setSelected(post)}
                            title={post.title}
                          >
                            {post.title}
                          </button>
                          <p
                            className="mt-1 max-w-[24rem] truncate text-xs text-muted-foreground"
                            title={post.slug}
                          >
                            /{post.slug}
                          </p>
                        </td>
                        <td className="px-3 py-2">
                          {statusBadge(post.status)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(post.tags || [])
                              .slice(0, MAX_TABLE_TAGS)
                              .map((tag) => (
                                <Badge key={tag} variant="outline">
                                  {tag}
                                </Badge>
                              ))}
                            {(post.tags || []).length > MAX_TABLE_TAGS && (
                              <Badge variant="secondary">
                                +{(post.tags || []).length - MAX_TABLE_TAGS}{" "}
                                more
                              </Badge>
                            )}
                            {(post.tags || []).length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                          {post.publishedAt
                            ? new Date(post.publishedAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-right text-muted-foreground">
                          {post.viewCount ?? 0}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9"
                              onClick={() => setSelected(post)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9"
                              aria-label="Edit post"
                              onClick={() => openEditModal(post)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 w-9 text-destructive border-destructive/50 hover:bg-destructive/10"
                              aria-label="Delete post"
                              onClick={() => handleDelete(post._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-sm">
                <p className="text-muted-foreground">
                  Page {page} of {pageCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Preview</CardTitle>
              <CardDescription>
                Quick look at the selected post.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selected ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold">
                        {selected.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        /{selected.slug}
                      </p>
                    </div>
                    {statusBadge(selected.status)}
                  </div>
                  {selected.excerpt && (
                    <p className="text-muted-foreground text-sm">
                      {selected.excerpt}
                    </p>
                  )}
                  {selected.coverImage && (
                    <div className="rounded-lg overflow-hidden border">
                      <img
                        src={selected.coverImage}
                        alt={selected.title}
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      {selected.publishedAt
                        ? `Published ${new Date(selected.publishedAt).toLocaleDateString()}`
                        : "Not published yet"}
                    </p>
                    <p className="text-muted-foreground">
                      {selected.estimatedReadMinutes ?? 0} min read ·{" "}
                      {selected.viewCount ?? 0} views
                    </p>
                    {selected.author?.email && (
                      <p className="text-muted-foreground">
                        Author: {selected.author.email}
                      </p>
                    )}
                  </div>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed max-h-64 overflow-auto whitespace-pre-wrap">
                    {selected.content || "No content available."}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => openEditModal(selected)}
                    >
                      Edit Post
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => handleDelete(selected._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Select a post to preview its details.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
                className="h-9 w-9 p-0"
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="h-6 w-px bg-border" />
              <h3 className="text-sm font-medium">
                {editingId ? "Editing Post" : "Drafting New Post"}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, status: "draft" }))}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    form.status === "draft"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Draft
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, status: "published" }))
                  }
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    form.status === "published"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Publish
                </button>
              </div>
              <Button onClick={handleSubmit} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingId ? "Update" : "Save"}
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden">
            <div className="flex h-full">
              {/* Content Area */}
              <div className="flex-1 overflow-y-auto px-12 py-8">
                <div className="mx-auto max-w-4xl space-y-8">
                  <div className="space-y-4">
                    <textarea
                      placeholder="Post Title..."
                      className="w-full resize-none border-none bg-transparent text-4xl font-bold placeholder:text-muted-foreground/30 focus:outline-none focus:ring-0"
                      rows={1}
                      value={form.title}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, title: e.target.value }));
                        // Auto-adjust height
                        e.target.style.height = "auto";
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.preventDefault();
                      }}
                    />
                    <div className="h-px bg-border/60" />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Body Content
                      </label>
                      <div className="flex items-center gap-3 text-xs">
                        {imageUploading ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                        ) : imageUploadSuccess ? (
                          <span className="text-green-600">
                            Image added!
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="min-h-[500px] prose prose-sm max-w-none">
                      <div
                        ref={quillWrapperRef}
                        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar Settings */}
              <aside className="w-80 border-l bg-muted/20 overflow-y-auto p-6 space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Cover Image
                    </label>
                    <div
                      className="group relative flex aspect-video cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-background transition hover:border-accent/50 hover:bg-muted/30"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {form.coverImage ? (
                        <>
                          <img
                            src={form.coverImage}
                            alt="Cover"
                            className="h-full w-full object-cover transition group-hover:opacity-50"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Button variant="secondary" size="sm">
                              Change
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Plus className="h-6 w-6" />
                          <span className="text-[10px] font-medium">
                            Upload Cover
                          </span>
                        </div>
                      )}
                      {coverUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverImageInputChange}
                    />
                    <Input
                      placeholder="Paste image URL..."
                      value={form.coverImage}
                      className="h-8 text-xs bg-background"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, coverImage: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Slug
                      </label>
                      <button
                        type="button"
                        onClick={handleSlugSync}
                        className="text-[10px] text-accent hover:underline"
                      >
                        Generate
                      </button>
                    </div>
                    <Input
                      placeholder="url-friendly-slug"
                      value={form.slug}
                      className="h-9 text-sm bg-background"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, slug: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tags
                    </label>
                    <Input
                      placeholder="news, update, guide"
                      value={form.tags}
                      className="h-9 text-sm bg-background"
                      onChange={(e) =>
                        setForm((p) => ({ ...p, tags: e.target.value }))
                      }
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Separate tags with commas
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Excerpt
                    </label>
                    <textarea
                      placeholder="Brief summary of the post..."
                      className="w-full min-h-[100px] rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      value={form.excerpt}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, excerpt: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Asset Management
                    </label>
                    <Input
                      placeholder="Folder path (e.g. blogs/tech)"
                      value={imageFolder}
                      className="h-9 text-sm bg-background font-mono"
                      onChange={(e) => setImageFolder(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Determines where images are saved in storage.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </main>

          <input
            ref={quillImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleQuillImageInputChange}
          />
        </div>
      )}
    </div>
  );
}
