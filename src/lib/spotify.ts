import { config } from './config.js';
import { logger } from './logger.js';

interface SpotifyToken {
  access_token: string;
  expires_at: number;
}

let token: SpotifyToken | null = null;

async function getAccessToken(): Promise<string> {
  if (token && Date.now() < token.expires_at) {
    return token.access_token;
  }

  if (!config.SPOTIFY_CLIENT_ID || !config.SPOTIFY_CLIENT_SECRET) {
    throw new Error('Spotify credentials not configured. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${config.SPOTIFY_CLIENT_ID}:${config.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json() as { access_token: string; expires_in: number };
  token = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };

  logger.debug('Spotify token refreshed');
  return token.access_token;
}

async function spotifyFetch<T>(endpoint: string): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error ${response.status}: ${error}`);
  }

  return response.json() as Promise<T>;
}

// --- Types ---

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  followers: { total: number };
  images: Array<{ url: string; width: number; height: number }>;
  external_urls: { spotify: string };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string; external_urls: { spotify: string } }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
    release_date: string;
    external_urls: { spotify: string };
  };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  track_number: number;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string; external_urls: { spotify: string } }>;
  images: Array<{ url: string }>;
  release_date: string;
  total_tracks: number;
  popularity: number;
  genres: string[];
  label: string;
  tracks: { items: SpotifyTrack[] };
  external_urls: { spotify: string };
}

interface SearchResult<T> {
  items: T[];
}

// --- API Methods ---

export async function searchArtist(query: string): Promise<SpotifyArtist | null> {
  const data = await spotifyFetch<{ artists: SearchResult<SpotifyArtist> }>(
    `/search?q=${encodeURIComponent(query)}&type=artist&limit=1`
  );
  return data.artists.items[0] ?? null;
}

export async function searchTrack(query: string): Promise<SpotifyTrack | null> {
  const data = await spotifyFetch<{ tracks: SearchResult<SpotifyTrack> }>(
    `/search?q=${encodeURIComponent(query)}&type=track&limit=1`
  );
  return data.tracks.items[0] ?? null;
}

export async function searchAlbum(query: string): Promise<SpotifyAlbum | null> {
  const data = await spotifyFetch<{ albums: SearchResult<SpotifyAlbum> }>(
    `/search?q=${encodeURIComponent(query)}&type=album&limit=1`
  );
  const result = data.albums.items[0];
  if (!result) return null;
  // Search results don't include full track list, fetch the full album
  return getAlbum(result.id);
}

export async function getArtistTopTracks(artistId: string): Promise<SpotifyTrack[]> {
  const data = await spotifyFetch<{ tracks: SpotifyTrack[] }>(
    `/artists/${artistId}/top-tracks?market=US`
  );
  return data.tracks;
}

export async function getRelatedArtists(artistId: string): Promise<SpotifyArtist[]> {
  const data = await spotifyFetch<{ artists: SpotifyArtist[] }>(
    `/artists/${artistId}/related-artists`
  );
  return data.artists;
}

export async function getAlbum(albumId: string): Promise<SpotifyAlbum> {
  return spotifyFetch<SpotifyAlbum>(`/albums/${albumId}`);
}

// --- Helpers ---

export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function popularityBar(popularity: number): string {
  const filled = Math.round(popularity / 10);
  return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled) + ` ${popularity}/100`;
}

export function isSpotifyConfigured(): boolean {
  return Boolean(config.SPOTIFY_CLIENT_ID && config.SPOTIFY_CLIENT_SECRET);
}
