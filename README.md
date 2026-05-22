# TubeToBlog

AI-powered tool that converts YouTube videos into SEO-optimized blog posts.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js
- **AI**: MiniMax M2.7
- **Payments**: Stripe
- **Deployment**: Vercel

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
```

Fill in your API keys:
- Supabase credentials
- NextAuth secret
- YouTube Data API key
- MiniMax API key
- Stripe keys

3. Set up Supabase database:
```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create generations table
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES profiles(email),
  youtube_url TEXT,
  video_title TEXT,
  blog_content TEXT,
  seo_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Features

- YouTube URL to SEO-optimized blog post conversion
- AI-powered content generation with MiniMax M2.7
- Credit-based usage system
- Stripe payment integration
- Markdown export
- SEO scorecard with metrics

## Pricing

- **Free**: 2 generations
- **Pro**: $9.90 for 50 generations

## License

MIT
