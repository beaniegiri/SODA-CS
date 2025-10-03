// Instagram Graph API endpoint (replace ACCESS_TOKEN if needed)
const SODA_ENDPOINT = "https://graph.facebook.com/v19.0/17841474942715498/media?fields=id,caption,media_url,timestamp&access_token=EAA4BJ7sqnR8BPNHDJfhZAC0PeSO3uKxMdhmUUYzI0o0vLCu5QK4394PH35lrwzlVLvF03UfziYeD5yqZAZBT7vDTVmJTU9msaylyCVEWbfCEdZB3AZCdZBuzn0UcuU9KbgMMOHev2lI46uZBr3jUiPKGoxdeZBMHMkmuvBZATPezB2AtQVjxvEZBa59Rxoi1ZBYrXC9VYP8";


// Fetch SoDA feed
async function fetchSoDAFeed() {
  try {
    const res = await fetch(SODA_ENDPOINT);
    if (!res.ok) throw new Error("Failed to fetch SoDA feed");
    const data = await res.json();

    // Extract posts
    return data.data.map(post => ({
      id: post.id,
      user: "binisagiri0",  // Graph API doesn’t return username in this call
      platform: "Instagram",
      time: new Date(post.timestamp).toLocaleString(),
      text: post.caption || "(no caption)",
      media_url: post.media_url
    }));
  } catch (err) { 
    console.error("Error fetching SoDA feed:", err);
    return [];
  }
}
