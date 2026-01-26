import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { forumApi } from "@/api/forum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function CreateForumPostPage() {
  const { topicId } = useParams();
  const tid = Number(topicId);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const titleTrimmed = title.trim();
  const contentTrimmed = content.trim();
  const canPublish = titleTrimmed.length > 0 && contentTrimmed.length > 0 && !saving;

  const onSubmit = async () => {
    try {
      setSaving(true);
      setErr(null);

      if (!titleTrimmed || !contentTrimmed) {
        throw new Error("Title and content are required");
      }

      const created = await forumApi.createPost({
        topicId: tid,
        title: titleTrimmed,
        content: contentTrimmed,
      });

      navigate(`/forum/posts/${created.id}`);
    } catch (e: any) {
      setErr(e?.message || "Failed to create post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Create Post
            </h1>
            <p className="text-sm text-muted-foreground">
              Share details clearly—include symptoms, location, and what you already tried.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to={`/forum/topics/${tid}`}>Back</Link>
            </Button>
          </div>
        </div>

        {err && <div className="mt-4 text-sm text-destructive">{err}</div>}

        <Card className="mt-6 rounded-2xl">
          <CardHeader>
            <CardTitle>New Post</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Example: Rice leaves turning yellow—what should I do?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Keep it short and specific.</span>
                <span>{title.length}/120</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Details</label>
              <Textarea
                placeholder={
                  "Write the full details:\n- What crop/animal?\n- Symptoms?\n- When it started?\n- Any photos?\n- Location (district/upazila)?\n- What you tried so far?"
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[220px]"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Use bullet points for clarity.</span>
                <span>{content.length} chars</span>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
                disabled={saving}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                onClick={onSubmit}
                disabled={!canPublish}
                className="w-full sm:w-auto"
              >
                {saving ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
