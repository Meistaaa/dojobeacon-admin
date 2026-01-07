import { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import PageHeader from "../components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import api from "../lib/axiosInstance";

type AboutAppResponse = {
  content?: {
    _id: string;
    content: string;
    language?: string;
    platform?: string;
  };
};

type TermsResponse = {
  terms?: {
    _id: string;
    content: string;
    version?: string;
    language?: string;
  };
};

type PrivacyResponse = {
  data?: {
    privacyPolicy?: {
      _id: string;
      content: string;
    };
  };
};

type RefundPolicyResponse = {
  data?: {
    refundPolicy?: {
      _id: string;
      content: string;
    };
  };
};

type ServicePolicyResponse = {
  data?: {
    servicePolicy?: {
      _id: string;
      content: string;
    };
  };
};

const editorToolbar = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline", "strike"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "blockquote", "code-block"],
  ["clean"],
];

type QuillEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

function QuillEditor({ value, onChange }: QuillEditorProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const lastHtmlRef = useRef<string>("");
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!wrapperRef.current || quillRef.current) return;
    wrapperRef.current.innerHTML = "";
    const editorEl = document.createElement("div");
    wrapperRef.current.appendChild(editorEl);
    const quill = new Quill(editorEl, {
      theme: "snow",
      modules: { toolbar: editorToolbar },
    });
    quillRef.current = quill;
    quill.root.innerHTML = value || "";
    lastHtmlRef.current = quill.root.innerHTML;

    const handler = () => {
      const html = quill.root.innerHTML;
      if (html !== lastHtmlRef.current) {
        lastHtmlRef.current = html;
        onChangeRef.current(html);
      }
    };
    quill.on("text-change", handler);
    return () => {
      quill.off("text-change", handler);
      quillRef.current = null;
      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;
    if (value !== lastHtmlRef.current) {
      quill.root.innerHTML = value || "";
      lastHtmlRef.current = value || "";
    }
  }, [value]);

  return <div className="min-h-[220px]" ref={wrapperRef} />;
}

export default function ContentPage() {
  const [aboutLanguage, setAboutLanguage] = useState("en");
  const [aboutPlatform, setAboutPlatform] = useState("android");
  const [aboutId, setAboutId] = useState<string | null>(null);
  const [aboutContent, setAboutContent] = useState("");
  const [aboutLoading, setAboutLoading] = useState(true);
  const [aboutSaving, setAboutSaving] = useState(false);

  const [termsLanguage, setTermsLanguage] = useState("en");
  const [termsId, setTermsId] = useState<string | null>(null);
  const [termsVersion, setTermsVersion] = useState<string | null>(null);
  const [termsContent, setTermsContent] = useState("");
  const [termsLoading, setTermsLoading] = useState(true);
  const [termsSaving, setTermsSaving] = useState(false);

  const [privacyId, setPrivacyId] = useState<string | null>(null);
  const [privacyContent, setPrivacyContent] = useState("");
  const [privacyLoading, setPrivacyLoading] = useState(true);
  const [privacySaving, setPrivacySaving] = useState(false);

  const [refundId, setRefundId] = useState<string | null>(null);
  const [refundContent, setRefundContent] = useState("");
  const [refundLoading, setRefundLoading] = useState(true);
  const [refundSaving, setRefundSaving] = useState(false);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [serviceContent, setServiceContent] = useState("");
  const [serviceLoading, setServiceLoading] = useState(true);
  const [serviceSaving, setServiceSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const loadAbout = async () => {
    try {
      setAboutLoading(true);
      setError(null);
      const res = await api.get<AboutAppResponse>("/about-app", {
        params: { language: aboutLanguage, platform: aboutPlatform },
      });
      const content = res.data?.content;
      setAboutId(content?._id ?? null);
      setAboutContent(content?.content ?? "");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setAboutId(null);
        setAboutContent("");
        return;
      }
      console.error(err);
      setError("Failed to load About App content.");
    } finally {
      setAboutLoading(false);
    }
  };

  const loadTerms = async () => {
    try {
      setTermsLoading(true);
      setError(null);
      const res = await api.get<TermsResponse>("/terms-and-conditions", {
        headers: { "Accept-Language": termsLanguage },
      });
      const terms = res.data?.terms;
      setTermsId(terms?._id ?? null);
      setTermsVersion(terms?.version ?? null);
      setTermsContent(terms?.content ?? "");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setTermsId(null);
        setTermsVersion(null);
        setTermsContent("");
        return;
      }
      console.error(err);
      setError("Failed to load terms and conditions.");
    } finally {
      setTermsLoading(false);
    }
  };

  const loadPrivacy = async () => {
    try {
      setPrivacyLoading(true);
      setError(null);
      const res = await api.get<PrivacyResponse>("/privacy-policy");
      const policy = res.data?.data?.privacyPolicy;
      setPrivacyId(policy?._id ?? null);
      setPrivacyContent(policy?.content ?? "");
    } catch (err) {
      console.error(err);
      setError("Failed to load privacy policy.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const loadRefund = async () => {
    try {
      setRefundLoading(true);
      setError(null);
      const res = await api.get<RefundPolicyResponse>("/refund-policy");
      const policy = res.data?.data?.refundPolicy;
      setRefundId(policy?._id ?? null);
      setRefundContent(policy?.content ?? "");
    } catch (err) {
      console.error(err);
      setError("Failed to load refund policy.");
    } finally {
      setRefundLoading(false);
    }
  };

  const loadService = async () => {
    try {
      setServiceLoading(true);
      setError(null);
      const res = await api.get<ServicePolicyResponse>("/service-policy");
      const policy = res.data?.data?.servicePolicy;
      setServiceId(policy?._id ?? null);
      setServiceContent(policy?.content ?? "");
    } catch (err) {
      console.error(err);
      setError("Failed to load service policy.");
    } finally {
      setServiceLoading(false);
    }
  };

  useEffect(() => {
    loadAbout();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aboutLanguage, aboutPlatform]);

  useEffect(() => {
    loadTerms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termsLanguage]);

  useEffect(() => {
    loadPrivacy();
  }, []);

  useEffect(() => {
    loadRefund();
    loadService();
  }, []);

  const saveAbout = async () => {
    try {
      setAboutSaving(true);
      setError(null);
      if (!aboutContent.trim()) {
        setError("About App content is required.");
        return;
      }
      if (aboutId) {
        await api.patch(`/about-app/${aboutId}`, {
          content: aboutContent,
          language: aboutLanguage,
          platform: aboutPlatform,
        });
      } else {
        const res = await api.post("/about-app", {
          content: aboutContent,
          language: aboutLanguage,
          platform: aboutPlatform,
        });
        setAboutId(res.data?.aboutApp?._id ?? null);
      }
      await loadAbout();
    } catch (err) {
      console.error(err);
      setError("Failed to save About App content.");
    } finally {
      setAboutSaving(false);
    }
  };

  const saveTerms = async () => {
    try {
      setTermsSaving(true);
      setError(null);
      if (!termsContent.trim()) {
        setError("Terms content is required.");
        return;
      }
      await api.post(
        "/terms-and-conditions",
        { content: termsContent },
        { headers: { "Accept-Language": termsLanguage } }
      );
      await loadTerms();
    } catch (err) {
      console.error(err);
      setError("Failed to publish terms and conditions.");
    } finally {
      setTermsSaving(false);
    }
  };

  const savePrivacy = async () => {
    try {
      setPrivacySaving(true);
      setError(null);
      if (!privacyContent.trim()) {
        setError("Privacy policy content is required.");
        return;
      }
      if (privacyId) {
        await api.patch(`/privacy-policy/${privacyId}`, {
          content: privacyContent,
        });
      } else {
        const res = await api.post("/privacy-policy", { content: privacyContent });
        setPrivacyId(res.data?.data?.privacyPolicy?._id ?? null);
      }
      await loadPrivacy();
    } catch (err) {
      console.error(err);
      setError("Failed to save privacy policy.");
    } finally {
      setPrivacySaving(false);
    }
  };

  const saveRefund = async () => {
    try {
      setRefundSaving(true);
      setError(null);
      if (!refundContent.trim()) {
        setError("Refund policy content is required.");
        return;
      }
      if (refundId) {
        await api.patch(`/refund-policy/${refundId}`, {
          content: refundContent,
        });
      } else {
        const res = await api.post("/refund-policy", { content: refundContent });
        setRefundId(res.data?.data?.refundPolicy?._id ?? null);
      }
      await loadRefund();
    } catch (err) {
      console.error(err);
      setError("Failed to save refund policy.");
    } finally {
      setRefundSaving(false);
    }
  };

  const saveService = async () => {
    try {
      setServiceSaving(true);
      setError(null);
      if (!serviceContent.trim()) {
        setError("Service policy content is required.");
        return;
      }
      if (serviceId) {
        await api.patch(`/service-policy/${serviceId}`, {
          content: serviceContent,
        });
      } else {
        const res = await api.post("/service-policy", { content: serviceContent });
        setServiceId(res.data?.data?.servicePolicy?._id ?? null);
      }
      await loadService();
    } catch (err) {
      console.error(err);
      setError("Failed to save service policy.");
    } finally {
      setServiceSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content"
        description="Manage About App, Terms & Conditions, and Privacy Policy."
      />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">About App</CardTitle>
            <CardDescription>Content shown in the About section of the app.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={aboutLanguage}
              onChange={(e) => setAboutLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={aboutPlatform}
              onChange={(e) => setAboutPlatform(e.target.value)}
            >
              <option value="android">Android</option>
              <option value="ios">iOS</option>
              <option value="web">Web</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {aboutLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            <QuillEditor value={aboutContent} onChange={setAboutContent} />
          )}
          <div className="flex justify-end">
            <Button onClick={saveAbout} disabled={aboutSaving || aboutLoading}>
              {aboutSaving ? "Saving..." : aboutId ? "Update About App" : "Create About App"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            <CardDescription>
              Latest version{termsVersion ? `: v${termsVersion}` : ""} for the selected language.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
              value={termsLanguage}
              onChange={(e) => setTermsLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="ur">Urdu</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {termsLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            <QuillEditor value={termsContent} onChange={setTermsContent} />
          )}
          <div className="flex justify-end">
            <Button onClick={saveTerms} disabled={termsSaving || termsLoading}>
              {termsSaving ? "Publishing..." : "Publish New Version"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Privacy Policy</CardTitle>
          <CardDescription>Latest privacy policy content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {privacyLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            <QuillEditor value={privacyContent} onChange={setPrivacyContent} />
          )}
          <div className="flex justify-end">
            <Button onClick={savePrivacy} disabled={privacySaving || privacyLoading}>
              {privacySaving ? "Saving..." : privacyId ? "Update Privacy Policy" : "Create Privacy Policy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Refund Policy</CardTitle>
          <CardDescription>Latest refund policy content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {refundLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            <QuillEditor value={refundContent} onChange={setRefundContent} />
          )}
          <div className="flex justify-end">
            <Button onClick={saveRefund} disabled={refundSaving || refundLoading}>
              {refundSaving ? "Saving..." : refundId ? "Update Refund Policy" : "Create Refund Policy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Policy</CardTitle>
          <CardDescription>Latest service policy content.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {serviceLoading ? (
            <p className="text-sm text-muted-foreground">Loading content...</p>
          ) : (
            <QuillEditor value={serviceContent} onChange={setServiceContent} />
          )}
          <div className="flex justify-end">
            <Button onClick={saveService} disabled={serviceSaving || serviceLoading}>
              {serviceSaving ? "Saving..." : serviceId ? "Update Service Policy" : "Create Service Policy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
