const feedContainer = document.getElementById("soda-feed-container");
const selectedPost = document.getElementById("selected-post");
const postDetails = document.getElementById("post-details");
const riskScores = document.getElementById("risk-scores");
const activityLog = document.getElementById("activity-log");
const enrichedEvents = document.getElementById("enriched-events");

let currentPost = null; // keep track of the selected post

async function fetchAbusiveWords() {
  const response = await fetch("/abusive_words.txt");
  const text = await response.text();
  return text.split("\n").map(word => word.trim()).filter(word => word);
}

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
  enrichedEvents.innerHTML = `<p>Loading comments...</p>`;

  // Fetch and display comments when post is selected
  loadCommentsForPost(post.id);
}

// Modified function to load and display comments in the CyberShield Detection Console
// Modified function to load and display comments with report functionality
async function loadCommentsForPost(mediaId) {
  try {
    // Fetch comments using the function from soda.js
    const comments = await fetchComments(mediaId);
    
    if (comments.length === 0) {
      enrichedEvents.innerHTML = '<p style="color: #666; font-style: italic;">No comments found for this post.</p>';
      return;
    }

    // Display comments in the CyberShield Detection Console (enrichedEvents)
    let commentsHTML = `<h4>Comments (${comments.length})</h4>`;
    commentsHTML += `<div style="max-height: 300px; overflow-y: auto; border: 1px solid #ddd; padding: 10px; border-radius: 4px; background: #f9f9f9;">`;
    
    comments.forEach((comment, index) => {
      commentsHTML += `
        <div style="border-bottom: 1px solid #e0e0e0; padding: 8px 0; margin-bottom: 8px; background: white; padding: 8px; border-radius: 4px; position: relative;">
          <div style="font-weight: bold; color: #1a73e8;">${comment.user}</div>
          <div style="font-size: 11px; color: #666; margin-bottom: 4px;">${comment.time}</div>
          <div style="color: #333; line-height: 1.4; margin-bottom: 8px;">${comment.text}</div>
          
          <!-- Report Button -->
          <button 
            onclick="reportComment('${comment.id}', '${comment.user}', \`${comment.text.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" 
            style="
              background: #ff4444; 
              color: white; 
              border: none; 
              padding: 4px 8px; 
              border-radius: 3px; 
              font-size: 11px; 
              cursor: pointer;
              float: right;
            "
            onmouseover="this.style.background='#cc0000'" 
            onmouseout="this.style.background='#ff4444'"
          >
            Report
          </button>
          
          <!-- Run Detection on Comment Button -->
          <button 
            onclick="runCommentDetection('${comment.id}', \`${comment.text.replace(/`/g, '\\`').replace(/'/g, "\\'")}\`)" 
            style="
              background: #007bff; 
              color: white; 
              border: none; 
              padding: 4px 8px; 
              border-radius: 3px; 
              font-size: 11px; 
              cursor: pointer;
              margin-right: 5px;
              float: right;
            "
            onmouseover="this.style.background='#0056b3'" 
            onmouseout="this.style.background='#007bff'"
          >
            Detect
          </button>
          
          <div style="clear: both;"></div>
        </div>
      `;
    });
    
    commentsHTML += `</div>`;
    
    enrichedEvents.innerHTML = commentsHTML;
    
  } catch (error) {
    console.error("Error loading comments:", error);
    enrichedEvents.innerHTML = '<p style="color: red;">Error loading comments</p>';
  }
}

// Function to report a comment
function reportComment(commentId, username, commentText) {
  const reportReason = prompt(
    `Report comment by ${username}:\n"${commentText}"\n\nPlease enter the reason for reporting:`
  );
  
  if (reportReason && reportReason.trim()) {
    const reportEntry = {
      commentId: commentId,
      username: username,
      commentText: commentText,
      reason: reportReason.trim(),
      timestamp: new Date().toISOString(),
      reportedBy: 'moderator'
    };
    
    console.log("Comment reported:", reportEntry);
    
    // Add to activity log
    const logEntry = document.createElement("p");
    logEntry.style.color = "#ff4444";
    logEntry.textContent = `${new Date().toLocaleTimeString()} — Comment by ${username} reported: ${reportReason}`;
    activityLog.appendChild(logEntry);
    
    // Show confirmation
    alert(`Comment by ${username} has been reported for: ${reportReason}`);
    
    // Send report to backend
    sendReportToBackend(reportEntry);
  }
}

// Function to run detection on individual comments
async function runCommentDetection(commentId, commentText) {
  try {
    const abusiveWords = await fetchAbusiveWords();
    
    const res = await fetch("http://localhost:8000/detect-abuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: commentText,
        abusive_words: abusiveWords
      })
    });

    if (!res.ok) throw new Error("Detection API failed");

    const result = await res.json();
    const abusiveWordsFound = result.analysis['abusive-words-found'] || [];
    const sentiment = result.analysis.sentiment || { sentiment: "unknown", confidence: 0 };

    // Show detection result in a popup or update UI
    const detectionResult = `
      Comment Analysis:
      Text: "${commentText}"
      Abusive Content: ${abusiveWordsFound.length > 0 ? 'YES' : 'NO'}
      Sentiment: ${sentiment.sentiment} (${sentiment.confidence})
      ${abusiveWordsFound.length > 0 ? `\nAbusive words found: ${abusiveWordsFound.join(', ')}` : ''}
    `;
    
    alert(detectionResult);
    
    // Log detection result
    const logEntry = document.createElement("p");
    logEntry.style.color = abusiveWordsFound.length > 0 ? "#ff4444" : "#28a745";
    logEntry.textContent = `${new Date().toLocaleTimeString()} — Comment detection: ${abusiveWordsFound.length > 0 ? 'Abusive content found' : 'Clean content'}`;
    activityLog.appendChild(logEntry);
    
  } catch (err) {
    console.error("Comment detection error:", err);
    alert("Error running detection on comment");
  }
}

// Updated sendReportToBackend function
async function sendReportToBackend(reportData) {
  try {
    const res = await fetch("http://localhost:8000/report-comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reportData)
    });
    
    if (res.ok) {
      const result = await res.json();
      console.log("Report sent to backend successfully:", result);
      
      // Update activity log with confirmation
      const logEntry = document.createElement("p");
      logEntry.style.color = "#28a745";
      logEntry.textContent = `${new Date().toLocaleTimeString()} — Report #${result.report_id} saved to database`;
      activityLog.appendChild(logEntry);
    } else {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
  } catch (err) {
    console.error("Error sending report to backend:", err);
    
    // Update activity log with error
    const logEntry = document.createElement("p");
    logEntry.style.color = "#ff4444";
    logEntry.textContent = `${new Date().toLocaleTimeString()} — Failed to save report to database`;
    activityLog.appendChild(logEntry);
  }
}

// 🔹 ADD REPORTS MANAGEMENT CODE HERE 🔹

// Add this function to view all collected reports
async function viewCollectedReports() {
  try {
    const res = await fetch("http://localhost:8000/reports");
    const data = await res.json();
    
    console.log("Collected Reports:", data);
    
    if (data.reports.length === 0) {
      alert("No reports collected yet.");
      return;
    }
    
    let reportsDisplay = `Reports Summary:\nTotal: ${data.total}\nPending: ${data.pending}\nProcessed: ${data.processed}\n\n`;
    
    data.reports.forEach((report, index) => {
      reportsDisplay += `Report #${index + 1}:\n`;
      reportsDisplay += `User: ${report.username}\n`;
      reportsDisplay += `Reason: ${report.reason}\n`;
      reportsDisplay += `Status: ${report.status}\n`;
      reportsDisplay += `Comment: "${report.commentText.substring(0, 50)}..."\n`;
      reportsDisplay += `Time: ${new Date(report.timestamp).toLocaleString()}\n\n`;
    });
    
    alert(reportsDisplay);
    
  } catch (err) {
    console.error("Error fetching reports:", err);
    alert("Error fetching reports");
  }
}

// Add a button to view reports
function addReportsViewButton() {
  const viewReportsBtn = document.createElement('button');
  viewReportsBtn.textContent = 'View Reports';
  viewReportsBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    padding: 10px 15px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  `;
  
  viewReportsBtn.onmouseover = function() {
    this.style.background = '#218838';
  };
  
  viewReportsBtn.onmouseout = function() {
    this.style.background = '#28a745';
  };
  
  viewReportsBtn.onclick = viewCollectedReports;
  document.body.appendChild(viewReportsBtn);
}

// Function to create a more detailed reports modal
async function showReportsModal() {
  try {
    const res = await fetch("http://localhost:8000/reports");
    const data = await res.json();
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 80%;
      max-height: 80%;
      overflow-y: auto;
      position: relative;
      min-width: 600px;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 15px;
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    `;
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    // Modal content
    let modalHTML = `
      <h2>Reports Management</h2>
      <div style="margin-bottom: 20px;">
        <strong>Summary:</strong> ${data.total} total reports | 
        <span style="color: #ff6b35;">${data.pending} pending</span> | 
        <span style="color: #28a745;">${data.processed} processed</span>
      </div>
    `;
    
    if (data.reports.length === 0) {
      modalHTML += '<p>No reports found.</p>';
    } else {
      modalHTML += '<div style="max-height: 400px; overflow-y: auto;">';
      
      data.reports.forEach((report, index) => {
        const statusColor = report.status === 'pending' ? '#ff6b35' : '#28a745';
        modalHTML += `
          <div style="border: 1px solid #ddd; margin-bottom: 10px; padding: 15px; border-radius: 4px; background: #f9f9f9;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 10px;">
              <strong>Report #${index + 1}</strong>
              <span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${report.status}</span>
            </div>
            <p><strong>User:</strong> ${report.username}</p>
            <p><strong>Reason:</strong> ${report.reason}</p>
            <p><strong>Comment:</strong> "${report.commentText}"</p>
            <p><strong>Reported:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
            <p><strong>Processed:</strong> ${report.processed_at ? new Date(report.processed_at).toLocaleString() : 'Not processed'}</p>
          </div>
        `;
      });
      
      modalHTML += '</div>';
    }
    
    modalContent.innerHTML = modalHTML;
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    };
    
  } catch (err) {
    console.error("Error fetching reports:", err);
    alert("Error fetching reports");
  }
}

// Update the button to use the modal instead
function addReportsModalButton() {
  const viewReportsBtn = document.createElement('button');
  viewReportsBtn.textContent = 'Reports Dashboard';
  viewReportsBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    z-index: 1000;
    padding: 12px 16px;
    background: #17a2b8;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: bold;
    box-shadow: 0 3px 6px rgba(0,0,0,0.15);
    transition: all 0.2s;
  `;
  
  viewReportsBtn.onmouseover = function() {
    this.style.background = '#138496';
    this.style.transform = 'translateY(-1px)';
  };
  
  viewReportsBtn.onmouseout = function() {
    this.style.background = '#17a2b8';
    this.style.transform = 'translateY(0)';
  };
  
  viewReportsBtn.onclick = showReportsModal;
  document.body.appendChild(viewReportsBtn);
}

// Make sure runDetection function is properly defined
async function runDetection() {
  if (!currentPost) {
    alert("Please select a post first!");
    return;
  }

  try {
    // Fetch abusive words
    const abusiveWords = await fetchAbusiveWords();
    
    const res = await fetch("http://localhost:8000/detect-abuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: currentPost.text,
        abusive_words: abusiveWords
      })
    });

    if (!res.ok) throw new Error("Detection API failed");

    const result = await res.json();
    console.log("Backend response:", result);

    // Update UI with response
    const abusiveWordsFound = result.analysis['abusive-words-found'] || [];
    const sentiment = result.analysis.sentiment || { sentiment: "unknown", confidence: "0%" };

    riskScores.innerHTML = `
      <p><strong>${currentPost.user}</strong></p>
      <p>Abusive Detected: <strong>${abusiveWordsFound.length > 0 ? 'Yes' : 'No'}</strong></p>
      <p>Sentiment: ${sentiment.sentiment} (Confidence: ${sentiment.confidence})</p>
    `;

    enrichedEvents.innerHTML = `
      <p><strong>${currentPost.user}</strong> — ${currentPost.text}</p>
      <small>Analysis: ${result.analysis.text_analyze || 'Analysis completed'}</small>
    `;

    const logEntry = document.createElement("p");
    logEntry.textContent = `${new Date().toLocaleTimeString()} — Detection run on ${currentPost.user}: ${abusiveWordsFound.length > 0 ? 'Abusive content found' : 'No abusive content'}`;
    activityLog.appendChild(logEntry);

  } catch (err) {
    console.error("Detection error:", err);
    riskScores.innerHTML = `<p style="color:red;">Error running detection</p>`;
  }
}

// Wait for DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  window.sodaFeedContainer = document.getElementById("soda-feed-container");
  window.selectedPost = document.getElementById("selected-post");
  window.postDetails = document.getElementById("post-details");
  window.riskScores = document.getElementById("risk-scores");
  window.enrichedEvents = document.getElementById("enriched-events");
  window.activityLog = document.getElementById("activity-log");

  // Attach event listener to Run Detection button
  const runDetectionBtn = document.getElementById("run-detection-btn");
  if (runDetectionBtn) {
    runDetectionBtn.addEventListener("click", runDetection);
    console.log("✅ Run Detection button event listener attached");
  } else {
    console.error("❌ Run Detection button not found!");
  }

  // Load feed on start
  loadFeed();

  // Add reports management button
  addReportsModalButton();
});

// Also keep the old selector as backup
document.addEventListener('DOMContentLoaded', function() {
  const yellowBtn = document.querySelector(".btn.yellow");
  if (yellowBtn && !yellowBtn.id) {
    yellowBtn.addEventListener("click", runDetection);
  }
});
