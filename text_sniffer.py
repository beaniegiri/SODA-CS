import json
import torch
import re
import sys
sys.path.append('../Cybersheildcopy')  # Adjust the path to import from the parent directory
from transformers import pipeline
from sentence_transformers import SentenceTransformer,util
from text_processing import TextCleaner

cleaner=TextCleaner()
sentiment_analyzer=pipeline("sentiment-analysis")
embedding_model=SentenceTransformer('all-MiniLM-L6-v2')

# Step 1: Load abusive words from file
def load_abusive_words(file_path):
    with open(file_path, 'r') as file:
        return [word.strip().lower() for word in file.readlines()]
    # patterns=[re.compile(rf'\b{re.escape(word)}\b', re.IGNORECASE) for word in words]
    # return words, patterns

# Step 2: Preprocess input text
def preprocess_input(text):
   # Preprocess the text (e.g., remove special characters, lowercasing)
    cleaned_text = cleaner.clean(text)
    cleaned_text = cleaned_text[0]  # Extract the cleaned text from the tuple
    return cleaned_text   

#Step3: Analyze sentiment of the input text
def analyze_sentiment(text):
        cleaned_text = preprocess_input(text)
        result=sentiment_analyzer(cleaned_text)[0]
        return{
            "sentiment":result['label'],
            "confidence":round(result['score'],3)}

# Step 3: Check text for abusive words
def detect_abuse(text, abusive_words,similarity_threshold=0.6):
    cleaned_text = preprocess_input(text)  # Preprocess the input text
    # Convert abusive words to lowercase for case-insensitive matching
    detected = []
    words_in_text = cleaned_text.lower().split()  # Split input text into words
    sentiment_report=analyze_sentiment(text)
    text_embeddings=embedding_model.encode(words_in_text,convert_to_tensor=True)
    abusive_embeddings=embedding_model.encode(abusive_words,convert_to_tensor=True)

    for i, word_embeeding in enumerate(text_embeddings):
         cosine_scores=util.cos_sim(word_embeeding,abusive_embeddings)[0]
         max_score=torch.max(cosine_scores).item()
         if max_score>=similarity_threshold:
              matched_index=torch.argmax(cosine_scores).item()
              matched_word=abusive_words[matched_index]
              detected.append({
                   "word_in_text": words_in_text[i],
                "matched_with": matched_word,
                "similarity": round(max_score, 3),
                "severity": "high" if max_score > 0.8 else "medium",
                "text_analyzed": text,
                "sentiment": sentiment_report
              })
              
         
         
    #sentiment_report=analyze_sentiment(text)
    if detected:
        return{
            'abusive-words-found':detected,
            'sentiment':sentiment_report,
            "text_analyze":cleaned_text
        }
    else:
        return{
            "abusive-words_found":[],
            'sentiment':sentiment_report, #this one 
            "text_analyze":cleaned_text
        }
   

    
    
