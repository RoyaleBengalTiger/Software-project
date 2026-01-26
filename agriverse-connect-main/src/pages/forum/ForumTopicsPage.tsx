import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { forumApi, Topic } from "@/api/forum";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ForumTopicsPage() {
  const { isAdmin } = useAuth();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [query, setQuery] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // dialog state
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const list = await forumApi.listTopics();
    setTopics(list);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await load();
      } catch (e: any) {
        setErr(e?.message || "Failed to load topics");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
    );
  }, [topics, query]);

  const onCreateTopic = async () => {
    try {
      setCreating(true);
      setErr(null);

      const name = newName.trim();
      const description = newDesc.trim();

      if (!name) throw new Error("Forum name is required");

      await forumApi.createTopic({
        name,
        description: description || undefined,
      });

      setNewName("");
      setNewDesc("");
      setOpen(false);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to create forum");
    } finally {
      setCreating(false);
    }
  };

  const onDialogOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setNewName("");
      setNewDesc("");
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Forum</h1>
            <p className="text-sm text-muted-foreground">
              Ask questions, share tips, and learn from the community.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <div className="w-full sm:w-[360px]">
              <Input
                placeholder="Search forums…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            {isAdmin && (
              <Dialog open={open} onOpenChange={onDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">Create Forum</Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create a new forum</DialogTitle>
                    <DialogDescription>
                      Create a category for a crop, animal, or topic (admins only).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Forum name</label>
                      <Input
                        placeholder="e.g. rice, wheat, cattle"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use a short, clear name. It will be shown as a category.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Description (optional)</label>
                      <Textarea
                        placeholder="What belongs in this forum?"
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        className="min-h-[110px]"
                      />
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setOpen(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button onClick={onCreateTopic} disabled={creating}>
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="mt-6">
          {loading && (
            <div className="text-sm text-muted-foreground">Loading forums…</div>
          )}
          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!loading &&
            filtered.map((t) => (
              <Link
                key={t.id}
                to={`/forum/topics/${t.id}`}
                className="group outline-none"
              >
                <Card className="h-full rounded-2xl transition-shadow group-hover:shadow-md">
                  <CardHeader className="space-y-1">
                    <CardTitle className="flex items-start justify-between gap-3">
                      <span className="capitalize">{t.name}</span>
                      <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        {t.postCount} posts
                      </span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {t.description || "No description yet."}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Tap to open
                      </span>
                      <Button
                        className="pointer-events-none"
                        size="sm"
                        variant="secondary"
                      >
                        View
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
        </div>

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="mt-10 rounded-2xl border bg-card/40 p-8 text-center">
            <div className="mx-auto max-w-md space-y-2">
              <p className="text-base font-medium">No forums found</p>
              <p className="text-sm text-muted-foreground">
                Try a different search term.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
