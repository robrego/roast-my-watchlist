export interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  genres?: string[];
  director?: string;
  tagline?: string;
  overview?: string;
  media_type?: "movie" | "tv";
}

export type Intensity = "mild" | "spicy" | "brutal";

export interface RoastRequest {
  movies: Movie[];
  intensity: Intensity;
}
