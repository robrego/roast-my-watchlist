import { NextRequest, NextResponse } from "next/server";

const TMDB_BASE = "https://api.themoviedb.org/3";
const KEY = process.env.TMDB_API_KEY;

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("query");
  const movieId = req.nextUrl.searchParams.get("id");

  if (!KEY) {
    return NextResponse.json({ error: "TMDB_API_KEY not set" }, { status: 500 });
  }

  if (movieId) {
    const [details, credits] = await Promise.all([
      fetch(`${TMDB_BASE}/movie/${movieId}?api_key=${KEY}`).then((r) => r.json()),
      fetch(`${TMDB_BASE}/movie/${movieId}/credits?api_key=${KEY}`).then((r) => r.json()),
    ]);
    const director = credits.crew?.find((p: { job: string; name: string }) => p.job === "Director")?.name;
    return NextResponse.json({
      ...details,
      genres: details.genres?.map((g: { name: string }) => g.name),
      director,
    });
  }

  if (query) {
    const res = await fetch(
      `${TMDB_BASE}/search/movie?api_key=${KEY}&query=${encodeURIComponent(query)}&include_adult=false`
    );
    const data = await res.json();
    return NextResponse.json(data.results?.slice(0, 5) ?? []);
  }

  return NextResponse.json({ error: "Missing query or id" }, { status: 400 });
}
