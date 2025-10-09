const feedContainer = document.getElementById("soda-feed-container");
const selectedPost = document.getElementById("selected-post");
const postDetails = document.getElementById("post-details");
const riskScores = document.getElementById("risk-scores");
const activityLog = document.getElementById("activity-log");
const enrichedEvents = document.getElementById("enriched-events");

let currentPost = null; // keep track of the selected post

async function loadFeed() {
  feedContainer.innerHTML = "<p>Loading SoDA feed...</p>";
  const sodaData = await fetchSoDAFeed();

  if (!sodaData.length) {
    feedContainer.innerHTML = "<p>No posts found.</p>";
    return;
  }

  feedContainer.innerHTML = "";
  sodaData.forEach((post, index) => {
    const div = document.createElement("div");
    div.classList.add("feed-item");
    div.innerHTML = `
      <strong>${post.platform}</strong><br>
      <span>${post.user}</span><br>
      <small>${post.time}</small>
      <p>${post.text}</p>
      ${post.media_url ? `<img src="${post.media_url}" alt="media" style="max-width:100%; border-radius:6px; margin-top:6px;">` : ""}
    `;
    div.onclick = () => selectPost(post, index);
    feedContainer.appendChild(div);
  });
}

function selectPost(post, index) {
  currentPost = post; // store the selected post

  selectedPost.innerHTML = `
    <p><strong>${post.user}</strong> • ${post.platform}</p>
    <p>${post.text}</p>
    <small>${post.time}</small>
    ${post.media_url ? `<img src="${post.media_url}" alt="media" style="max-width:100%; border-radius:6px; margin-top:6px;">` : ""}
  `;
  console.log(post.text)

  postDetails.innerHTML = `
    <p><strong>User:</strong> ${post.user}</p>
    <p><strong>Platform:</strong> ${post.platform}</p>
    <p><strong>Time:</strong> ${post.time}</p>
    <p><strong>Text:</strong> ${post.text}</p>
  `;

  riskScores.innerHTML = `<p>Awaiting detection...</p>`;
  enrichedEvents.innerHTML = `<p>No enriched events yet</p>`;
}

async function fetchAbusiveWords() {
  const response = await fetch("/abusive_words.txt");
  const text = await response.text();
  return text.split("\n").map(word => word.trim()).filter(word => word);
}

// 🔹 Run Detection (POST request to backend)
async function runDetection() {
  if (!currentPost) {
    alert("Please select a post first!");
    return;
  }

  try {
    const abusiveWords = await fetchAbusiveWords(); // Fetch abusive words from the file

    const res = await fetch("http://localhost:8000/detect-abuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: currentPost.text,
        abusive_words: abusiveWords // Use the fetched abusive words
      })
    });

    if (!res.ok) throw new Error("Detection API failed");

    const result = await res.json();
    console.log("Backend response:", result); // Log the backend response

    // Update UI with response
    const abusiveWordsFound = result.analysis['abusive-words-found'] || [];
    const sentiment = result.analysis.sentiment || { sentiment: "unknown", confidence: 0 };

    riskScores.innerHTML = `
      <p><strong>${currentPost.user}</strong></p>
      <p>Abusive Detected: <strong>${abusiveWordsFound.length > 0 ? 'Yes' : 'No'}</strong></p>
      <p>Sentiment: ${sentiment.sentiment} (Confidence: ${sentiment.confidence})</p>
    `;

    enrichedEvents.innerHTML = `
      <p><strong>${currentPost.user}</strong> — ${currentPost.text}</p>
      <small>Analysis: ${result.analysis.text_analyze}</small>
    `;

    const logEntry = document.createElement("p");
    logEntry.textContent = `${new Date().toLocaleTimeString()} — Detection run on ${currentPost.user}: ${abusiveWordsFound.length > 0 ? 'Abusive content found' : 'No abusive content'}`;
    activityLog.appendChild(logEntry);

  } catch (err) {
    console.error("Detection error:", err);
    riskScores.innerHTML = `<p style="color:red;">Error running detection</p>`;
  }
}

// 🔹 Attach button listener
document.querySelector(".btn.yellow").addEventListener("click", runDetection);

// Load feed on start
loadFeed();
