import json
from abusive import WordRequest
from text_sniffer import load_abusive_words, detect_abuse

if __name__ == "__main__":
    # Load abusive words
    abusive_words = load_abusive_words("abusive_words.txt")
    
    file_path= "numbered_tweets.json"  # Path to the JSON file containing user text

# Open and read the file
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content_object = json.load(file)
    except FileNotFoundError:
        print("File not found. Please check the path and try again.")

    report_dict={}
    for  key in content_object:
        user_text=content_object[key]['text']
      
        # Detect abusive words
        report = detect_abuse(user_text, abusive_words, similarity_threshold=0.6)
         
        report_dict[key]=report

   
    async def detect_abuse(request: WordRequest):
        words = request.word.lower().split()  # Split input into words using space as a delimiter
        abusive_detected = any(word in abusive_words for word in words)  # Check if any word is abusive

        if abusive_detected:
            return {"abusive_detected": True, "message": "Abusive language detected."}
        return {"abusive_detected": False, "message": "No abusive language detected."}

    # Save report to JSON
    with open("abuse_report.json", "w", encoding='utf-8') as f:
        json.dump(report_dict, f, indent=4, ensure_ascii=False)  # `indent=4` makes JSON readable
    

    print("Analysis complete! Report saved to 'abuse_report.json'.")


