import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const movieId = req.nextUrl.searchParams.get("id");
  const mediaType = req.nextUrl.searchParams.get("type") ?? "movie";

  if (!KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY not set" }, { status: 500 });
  }

  if (movieId) {
    if (mediaType === "tv") {
      const [details, credits] = await Promise.all([
        fetch(`${TMDB_BASE}/tv/${movieId}?api_key=${KEY}`).then((r) => r.json()),
        fetch(`${TMDB_BASE}/tv/${movieId}/credits?api_key=${KEY}`).then((r) => r.json()),
      ]);
      const director = credits.crew?.find((p: { job: string; name: string }) => p.job === "Director")?.name;
      return NextResponse.json({
        ...details,
        title: details.name,
        release_date: details.first_air_date,
        genres: details.genres?.map((g: { name: string }) => g.name),
        director,
        media_type: "tv",
      });
    }

    const [details, credits] = await Promise.all([
      fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${KEY}`).then((r) => r.json()),
      fetch(`${TMDB_BASE}/movie/${movieId}/credits?api_key=${KEY}`).then((r) => r.json()),
    ]);
    const director = credits.crew?.find((p: { job: string; name: string }) => p.job === "Director")?.name;
    return NextResponse.json({
      ...details,
      genres: details.genres?.map((g: { name: string }) => g.name),
      director,
      media_type: "movie",
    });
  }

  if (query) {
    const [movies, shows] = await Promise.all([
      fetch(`${TMDB_BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`).then((r) => r.json()),
      fetch(`${TMDB_BASE}/search/tv?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`).then((r) => r.json()),
    ]);

    const movieResults = (movies.results ?? []).slice(0, 3).map((m: any) => ({ ...m, media_type: "movie" }));
    const tvResults = (shows.results ?? []).slice(0, 2).map((t: any) => ({
      ...t,
      title: t.name,
      release_date: t.first_air_date,
      media_type: "tv",
    }));

    return NextResponse.json([...movieResults, ...tvResults]);
  }

  return NextResponse.json({ error: "Missing query or id" }, { status: 400 });
}