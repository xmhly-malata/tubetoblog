import axios from 'axios';

export async function generateBlog(youtubeUrl: string): Promise<any> {
  const response = await axios.post('/api/generate', {
    youtubeUrl,
  });
  return response.data;
}

export async function getCredits(): Promise<number> {
  const response = await axios.get('/api/credits');
  return response.data.credits;
}

export async function purchaseCredits(purchaseToken: string): Promise<void> {
  await axios.post('/api/purchase', {
    purchaseToken,
  });
}
