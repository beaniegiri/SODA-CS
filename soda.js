// Instagram Graph API endpoint (replace ACCESS_TOKEN if needed)
const SODA_ENDPOINT = "https://graph.facebook.com/v19.0/17841474942715498/media?fields=id,caption,media_url,timestamp&access_token=EAA4BJ7sqnR8BPNHDJfhZAC0PeSO3uKxMdhmUUYzI0o0vLCu5QK4394PH35lrwzlVLvF03UfziYeD5yqZAZBT7vDTVmJTU9msaylyCVEWbfCEdZB3AZCdZBuzn0UcuU9KbgMMOHev2lI46uZBr3jUiPKGoxdeZBMHMkmuvBZATPezB2AtQVjxvEZBa59Rxoi1ZBYrXC9VYP8";
const ACCESS_TOKEN = "EAA4BJ7sqnR8BPNHDJfhZAC0PeSO3uKxMdhmUUYzI0o0vLCu5QK4394PH35lrwzlVLvF03UfziYeD5yqZAZBT7vDTVmJTU9msaylyCVEWbfCEdZB3AZCdZBuzn0UcuU9KbgMMOHev2lI46uZBr3jUiPKGoxdeZBMHMkmuvBZATPezB2AtQVjxvEZBa59Rxoi1ZBYrXC9VYP8";


// Fetch SoDA feed
async function fetchSoDAFeed() {
  console.log("🔄 Starting to fetch SoDA feed...");
  console.log("📡 API Endpoint:", SODA_ENDPOINT);
  
  try {
    const res = await fetch(SODA_ENDPOINT);
    console.log("📋 Response status:", res.status, res.statusText);
    
    if (!res.ok) {
      console.error("❌ API request failed:", res.status, res.statusText);
      throw new Error("Failed to fetch SoDA feed");
    }
    
    const data = await res.json();
    console.log("📊 Raw API data:", data);

    // Extract posts
    const posts = data.data.map(post => ({
      id: post.id,
      user: "binisagiri0",
      platform: "Instagram",
      time: new Date(post.timestamp).toLocaleString(),
      text: post.caption || "(no caption)",
      media_url: post.media_url
    }));
    
    console.log("✅ Processed posts:", posts);
    return posts;
    
  } catch (err) { 
    console.error("❌ Error fetching SoDA feed:", err);
    return [];
  }
}
// Fetch comments for a specific Instagram post
async function fetchComments(mediaId) {
  if (!mediaId) {
    console.error("No media ID provided");
    return [];
  }

  console.log("🔍 Fetching comments for media ID:", mediaId);
  
  const commentsEndpoint = `https://graph.facebook.com/v19.0/${mediaId}/comments`;
  const params = new URLSearchParams({
    fields: "id,text,username,timestamp",
    access_token: ACCESS_TOKEN
  });

  console.log("📡 Comments API URL:", `${commentsEndpoint}?${params}`);

  try {
    const res = await fetch(`${commentsEndpoint}?${params}`);
    console.log("📋 Response status:", res.status, res.statusText);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    console.log("📊 Raw comments data:", data);
    
    const comments = data.data || [];
    console.log("✅ Found", comments.length, "comments");
    
    // Format comments and use username from API response
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      user: comment.username || "unknown_user", // Use actual username from API
      platform: "Instagram",
      time: new Date(comment.timestamp).toLocaleString(),
      text: comment.text || "(no text)",
      type: "comment",
      parent_media_id: mediaId
    }));
    
    console.log("🎯 Formatted comments:", formattedComments);
    return formattedComments;
    
  } catch (err) {
    console.error("❌ Error fetching comments:", err);
    return [];
  }
}