import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { forumApi, Comment, Post } from "@/api/forum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function ForumPostPage() {
  const { postId } = useParams();
  const pid = Number(postId);

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const p = await forumApi.getPost(pid);
    const c = await forumApi.listComments(pid, 0, 200);
    setPost(p);
    setComments(c.content);
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await load();
      } catch (e: any) {
        setErr(e?.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const canSend = useMemo(() => text.trim().length > 0 && !sending, [text, sending]);

  const onComment = async () => {
    try {
      setSending(true);
      setErr(null);
      const c = text.trim();
      if (!c) throw new Error("Comment cannot be empty");
      await forumApi.createComment(pid, { content: c });
      setText("");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to comment");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-0px)] bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-10">
        {err && <div className="mb-4 text-sm text-destructive">{err}</div>}

        {post && (
          <>
            {/* Breadcrumb + actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to="/forum"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Forum
                  </Link>
                  <span className="text-sm text-muted-foreground">/</span>
                  <Link
                    to={`/forum/topics/${post.topicId}`}
                    className="text-sm text-muted-foreground hover:text-foreground capitalize"
                  >
                    {post.topicName}
                  </Link>
                </div>

                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                  {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    By{" "}
                    <span className="font-medium text-foreground">
                      {post.authorUsername}
                    </span>
                  </span>
                  <span className="hidden sm:inline">•</span>
                  <span>{new Date(post.createdAt).toLocaleString()}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs">
                    {comments.length} comments
                  </span>
                </div>
              </div>

              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link to={`/forum/topics/${post.topicId}`}>Back</Link>
              </Button>
            </div>

            {/* ✅ MAIN POST (distinct styling) */}
            <Card className="mt-6 overflow-hidden rounded-2xl border">
              {/* header strip */}
              <div className="border-b bg-muted/35 px-5 py-4 sm:px-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      Post
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Original question / details
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Posted {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* stronger “author block” */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {/* simple avatar circle (no extra component needed) */}
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground/10 text-xs font-semibold">
                      {post.authorUsername?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="leading-tight">
                      <div className="text-sm font-semibold">{post.authorUsername}</div>
                      <div className="text-xs text-muted-foreground">Author</div>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex rounded-full border px-2 py-1 text-xs text-muted-foreground">
                    #{post.id}
                  </span>
                </div>
              </div>

              <CardContent className="px-5 py-5 sm:px-6 sm:py-6">
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">
                  {post.content}
                </div>
              </CardContent>
            </Card>

            {/* Reply box */}
            <Card className="mt-6 rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Write a reply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Write your comment…"
                  className="min-h-[120px]"
                />
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    variant="secondary"
                    onClick={() => setText("")}
                    disabled={sending || text.length === 0}
                    className="w-full sm:w-auto"
                  >
                    Clear
                  </Button>
                  <Button onClick={onComment} disabled={!canSend} className="w-full sm:w-auto">
                    {sending ? "Sending…" : "Comment"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* ✅ COMMENTS (more compact + visually “secondary”) */}
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-semibold">
                  Comments <span className="text-muted-foreground">({comments.length})</span>
                </h2>
              </div>

              <div className="space-y-3">
                {comments.map((c) => (
                  <Card
                    key={c.id}
                    className="rounded-2xl border bg-card/60"
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-foreground/10 text-[10px] font-semibold">
                            {c.authorUsername?.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="leading-tight">
                            <div className="text-sm font-medium">{c.authorUsername}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                          Comment
                        </span>
                      </div>

                      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {c.content}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {comments.length === 0 && (
                  <div className="rounded-2xl border bg-card/40 p-8 text-center">
                    <p className="text-base font-medium">No comments yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Be the first to reply and help the community.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
