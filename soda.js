// Instagram Graph API endpoint (replace ACCESS_TOKEN if needed)
const SODA_ENDPOINT = "https://graph.facebook.com/v19.0/17841474942715498/media?fields=id,caption,media_url,timestamp&access_token=EAA4BJ7sqnR8BPNHDJfhZAC0PeSO3uKxMdhmUUYzI0o0vLCu5QK4394PH35lrwzlVLvF03UfziYeD5yqZAZBT7vDTVmJTU9msaylyCVEWbfCEdZB3AZCdZBuzn0UcuU9KbgMMOHev2lI46uZBr3jUiPKGoxdeZBMHMkmuvBZATPezB2AtQVjxvEZBa59Rxoi1ZBYrXC9VYP8";
const ACCESS_TOKEN = "EAA4BJ7sqnR8BPNHDJfhZAC0PeSO3uKxMdhmUUYzI0o0vLCu5QK4394PH35lrwzlVLvF03UfziYeD5yqZAZBT7vDTVmJTU9msaylyCVEWbfCEdZB3AZCdZBuzn0UcuU9KbgMMOHev2lI46uZBr3jUiPKGoxdeZBMHMkmuvBZATPezB2AtQVjxvEZBa59Rxoi1ZBYrXC9VYP8";
let isRawDataSaved = localStorage.getItem("rawSaved") === "true";

// Fetch SoDA feed
async function fetchSoDAFeed() {
  console.log("🔄 Checking if saved data exists...");

  // 1️⃣ Try loading saved data first
  const savedData = await loadSavedData("instagram_posts.json");

  if (savedData && savedData.data) {
    console.log("📂 Loaded saved Instagram feed instead of calling API");

    // Return the saved data
    return savedData.data.map(post => ({
      id: post.id,
      user: "binisagiri0",
      platform: "Instagram",
      time: new Date(post.timestamp).toLocaleString(),
      text: post.caption || "(no caption)",
      media_url: post.media_url,
    }));
  }

  console.log("⚠️ No saved data — calling API instead");

  // 2️⃣ Only call Instagram API if no saved data
  try {
    const res = await fetch(SODA_ENDPOINT);
    const data = await res.json();

    // ✅ Save data locally
    const filename = await saveRawDataLocally(data, "instagram_posts");

    if (!filename) {
      console.error("❌ Failed to save raw data locally.");
      return [];
    }

    // Return the data fetched from the API
    return data.data.map(post => ({
      id: post.id,
      user: "binisagiri0",
      platform: "Instagram",
      time: new Date(post.timestamp).toLocaleString(),
      text: post.caption || "(no caption)",
      media_url: post.media_url,
    }));
  } catch (err) {
    console.error("❌ Failed to fetch feed:", err);
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

// Global flag to ensure raw data is saved only once
// let isRawDataSaved = false;

async function saveRawDataLocally(rawData, dataType) {
  try {
    if (isRawDataSaved) {
      console.log("ℹ️ Raw data already saved, skipping save.");
      return;
    }

    const filename = `${dataType}.json`; // ✅ only one file!

    const response = await fetch("http://localhost:8000/save-raw-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: filename,
         data: rawData }),
    });

    const result = await response.json();

    if (result.status === "exists") {
      console.log("⚠️ File already exists — backend skipped save");
      isRawDataSaved = true;
      return filename;
    }

    if (response.ok) {
      console.log(`✅ Raw data saved as: ${filename}`);
      isRawDataSaved = true;
      return filename;
    }


  } catch (error) {
    console.error("❌ Error saving raw data locally:", error);
  }
}


async function loadSavedData(filename) {
  try {
    const response = await fetch(`http://localhost:8000/load-raw-data/${filename}`);
    if (!response.ok) {
      throw new Error("Failed to load saved data");
    }

    const savedData = await response.json();
    console.log("📂 Loaded saved data:", savedData);
    return savedData;
  } catch (error) {
    console.error("❌ Error loading saved data:", error);
    return null;
  }
}

async function detectAbuse(text, abusiveWords) {
  try {
    const response = await fetch("http://localhost:8000/detect-abuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, abusive_words: abusiveWords }),
    });

    if (!response.ok) {
      throw new Error("Failed to detect abuse");
    }

    const result = await response.json();
    console.log("🔍 Abuse detection result:", result);
    return result;
  } catch (error) {
    console.error("❌ Error detecting abuse:", error);
    return null;
  }
}

async function reportComment(commentId, username, commentText, reason) {
  try {
    const response = await fetch("http://localhost:8000/report-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commentId,
        username,
        commentText,
        reason,
        timestamp: new Date().toISOString(),
        reportedBy: "binisagiri0",
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to report comment");
    }

    const result = await response.json();
    console.log("📋 Report result:", result);
    return result;
  } catch (error) {
    console.error("❌ Error reporting comment:", error);
    return null;
  }
}

async function getAllReports() {
  try {
    const response = await fetch("http://localhost:8000/reports");
    if (!response.ok) {
      throw new Error("Failed to retrieve reports");
    }

    const reports = await response.json();
    console.log("📋 All reports:", reports);
    return reports;
  } catch (error) {
    console.error("❌ Error retrieving reports:", error);
    return null;
  }
}