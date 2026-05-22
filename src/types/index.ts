export interface Generation {
  id: string;
  user_id: string;
  youtube_url: string;
  video_title: string;
  blog_content: string;
  seo_data: {
    keywords: string[];
    meta_description: string;
    readability_score: number;
    keyword_density: number;
  };
  created_at: string;
}

export interface UserCredits {
  id: string;
  email: string;
  credits: number;
  created_at: string;
}

export interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
  duration: string;
  captions: string | null;
}

export interface SEOResult {
  title: string;
  content: string;
  seoData: {
    keywords: string[];
    metaDescription: string;
    readabilityScore: number;
    keywordDensity: number;
  };
  videoTitle: string;
  youtubeUrl: string;
}
