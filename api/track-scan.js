import { createClient } from 'redis';

let redisClient;

async function getClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });
    // Quietly log error events to prevent crash
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
    await redisClient.connect();
  }
  return redisClient;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { points } = req.query;
  const pStr = points ? points.toString().trim() : '';

  if (!pStr || !['2', '5', '10'].includes(pStr)) {
    return res.status(400).json({ error: 'Invalid points parameter' });
  }

  try {
    const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (redisUrl && redisToken) {
      // Option A: Use performance HTTP REST (if variables exist)
      await Promise.all([
        fetch(`${redisUrl}/incr/scan_points_${pStr}`, {
          headers: { Authorization: `Bearer ${redisToken}` }
        }),
        fetch(`${redisUrl}/incr/scan_total`, {
          headers: { Authorization: `Bearer ${redisToken}` }
        })
      ]);
      return res.status(200).json({ success: true });
    } else if (process.env.REDIS_URL) {
      // Option B: TCP connection fallback utilizing redis client wrapper
      const client = await getClient();
      await Promise.all([
        client.incr(`scan_points_${pStr}`),
        client.incr('scan_total')
      ]);
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({
        error: 'Vercel KV or REDIS_URL environment variables are not configured in Vercel Storage integration.'
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
