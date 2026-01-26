import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { forumApi, Post, Page } from "@/api/forum";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForumTopicPostsPage() {
  const { topicId } = useParams();
  const tid = Number(topicId);

  const PAGE_SIZE = 10;

  const [topicName, setTopicName] = useState("");
  const [pageData, setPageData] = useState<Page<Post> | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [pageIndex, setPageIndex] = useState(0); // 0-based
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // server-side search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = async (newPageIndex: number, q: string) => {
    const page = await forumApi.listPostsByTopic(tid, newPageIndex, PAGE_SIZE, q);
    setPageData(page);
    setPosts(page.content);

    if (page.content[0]?.topicName) {
      setTopicName(page.content[0].topicName);
    } else {
      const topics = await forumApi.listTopics();
      setTopicName(topics.find((x) => x.id === tid)?.name || "");
    }
  };

  useEffect(() => {
    setPageIndex(0);
  }, [debouncedSearch]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await load(pageIndex, debouncedSearch);
      } catch (e: any) {
        setErr(e?.message || "Failed to load posts");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tid, pageIndex, debouncedSearch]);

  const totalPages = pageData?.totalPages ?? 0;
  const canPrev = pageIndex > 0;
  const canNext = totalPages > 0 && pageIndex < totalPages - 1;

  // Jump UI
  const [jumpValue, setJumpValue] = useState("");
  useEffect(() => setJumpValue(""), [pageIndex, debouncedSearch]);

  const onJump = () => {
    const n = Number(jumpValue);
    if (!Number.isFinite(n)) return;
    if (n < 1 || n > totalPages) return;
    setPageIndex(n - 1);
  };

  const showingText = useMemo(() => {
    const total = pageData?.totalElements ?? 0;
    if (total === 0) return "No posts found.";
    const start = pageIndex * PAGE_SIZE + 1;
    const end = start + posts.length - 1;
    return `Showing ${start}–${end} of ${total} posts`;
  }, [pageData, pageIndex, posts.length]);

  return (
    <div className="min-h-[calc(100vh-0px)] bg-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        {/* Top bar */}
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
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight capitalize">
                {topicName || "Topic"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">{showingText}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Button asChild className="w-full sm:w-auto">
              <Link to={`/forum/topics/${tid}/new`}>Create Post</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link to="/forum">Back</Link>
            </Button>
          </div>
        </div>

        {/* Search + Pagination row */}
        <div className="mt-6 grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Input
              placeholder="Search posts by title or content…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-5">
            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page{" "}
                  <span className="font-medium text-foreground">
                    {totalPages === 0 ? 0 : pageIndex + 1}
                  </span>{" "}
                  of <span className="font-medium text-foreground">{totalPages}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canPrev || loading}
                    onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  >
                    Previous
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!canNext || loading}
                    onClick={() => setPageIndex((p) => p + 1)}
                  >
                    Next
                  </Button>

                  <div className="flex items-center gap-2">
                    <Input
                      className="h-9 w-24"
                      placeholder="Page"
                      value={jumpValue}
                      inputMode="numeric"
                      onChange={(e) => setJumpValue(e.target.value)}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading || totalPages === 0}
                      onClick={onJump}
                    >
                      Jump
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status */}
        <div className="mt-4">
          {loading && <div className="text-sm text-muted-foreground">Loading posts…</div>}
          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>

        {/* Posts list */}
        <div className="mt-6 space-y-3">
          {posts.map((p) => (
            <Link
              key={p.id}
              to={`/forum/posts/${p.id}`}
              className="block outline-none"
            >
              <Card className="rounded-2xl transition-shadow hover:shadow-md">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="text-lg sm:text-xl">{p.title}</span>

                    <span className="inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                      {p.commentCount} comments
                    </span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {p.content}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <div>
                      By <span className="font-medium">{p.authorUsername}</span>
                    </div>
                    <div>{new Date(p.createdAt).toLocaleString()}</div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" variant="secondary" className="pointer-events-none">
                      Open
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {!loading && posts.length === 0 && (
            <div className="rounded-2xl border bg-card/40 p-8 text-center">
              <p className="text-base font-medium">No posts match your search</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try shorter keywords or clear the search box.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setSearch("")}
                  disabled={!search}
                >
                  Clear search
                </Button>
                <Button asChild>
                  <Link to={`/forum/topics/${tid}/new`}>Create a post</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
