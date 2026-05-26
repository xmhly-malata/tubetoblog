import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_API_TIMEOUT = 30000;
const MAX_RETRIES = 3;

interface YoutubeVideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: any;
  duration: string;
  captions: string | null;
  publishedAt: string;
}

function createProxyAgent() {
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  
  if (httpsProxy) {
    console.log('Creating proxy agent with:', httpsProxy);
    return new HttpsProxyAgent(httpsProxy);
  }
  
  return undefined;
}

const httpsAgent = createProxyAgent();

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('Client network socket disconnected')
      ) {
        console.log(`Retry ${i + 1}/${retries} due to connection error`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          continue;
        }
      }
      
      throw error;
    }
  }
  
  throw lastError;
}

export async function getVideoInfo(videoId: string): Promise<YoutubeVideoInfo> {
  const fetchFn = async () => {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet,contentDetails`,
      { 
        timeout: YOUTUBE_API_TIMEOUT,
        httpsAgent: httpsAgent,
      }
    );

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error('Video not found');
    }

    const video = response.data.items[0];
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnails: video.snippet.thumbnails,
      duration: video.contentDetails.duration,
      captions: null,
      publishedAt: video.snippet.publishedAt,
    };
  };

  try {
    return await fetchWithRetry(fetchFn);
  } catch (error: any) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      throw new Error('YouTube API request timed out. Please check your network connection and try again.');
    }
    if (error.response?.status === 403) {
      throw new Error('YouTube API access denied. Please check your API key.');
    }
    if (error.response?.status === 404) {
      throw new Error('Video not found.');
    }
    if (error.code === 'ECONNRESET' || error.message?.includes('Client network socket disconnected')) {
      throw new Error('Connection to YouTube API was interrupted. Please try again.');
    }
    throw error;
  }
}

export async function getVideoCaptions(videoId: string): Promise<string> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/captions?videoId=${videoId}&key=${YOUTUBE_API_KEY}&part=snippet`,
      { 
        timeout: YOUTUBE_API_TIMEOUT,
        httpsAgent: httpsAgent,
      }
    );

    if (!response.data.items || response.data.items.length === 0) {
      return '';
    }

    const captionTrack = response.data.items[0];
    return captionTrack.snippet.language || 'en';
  } catch (error) {
    console.error('Error fetching captions:', error);
    return '';
  }
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

export function isValidYoutubeUrl(url: string): boolean {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]+/,
    /^(https?:\/\/)?(www\.)?youtu\.be\/[a-zA-Z0-9_-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]+/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]+/,
  ];

  return patterns.some(pattern => pattern.test(url));
}

export function convertDurationToSeconds(duration: string): number {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');

  return hours * 3600 + minutes * 60 + seconds;
}

export function isVideoTooLong(duration: string, maxMinutes: number = 20): boolean {
  const totalSeconds = convertDurationToSeconds(duration);
  return totalSeconds > maxMinutes * 60;
}