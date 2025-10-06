"""text_processing.py

This module provides utility functions for processing and manipulating text data.
It includes features such as text normalization, tokenization, removal of stopwords,
and other common text preprocessing tasks used in natural language processing (NLP) pipelines.

Functions:
    - clean_text: Cleans the input text by removing URLs, emojis, and non-standard characters.

Typical usage example:
    import text_processing
    processed_text = text_processing.clean(raw_text)

Author: Center for Equitable Artifical Intelligence and Machine Learning Systems (CEAMLS)
License: MIT License
"""

import re
import string


class TextCleaner:
    """
    A utility class for cleaning text by removing URLs, emojis, and non-standard characters.

    Attributes:
        URL_PATTERN (re.Pattern): Compiled regex pattern to match URLs.
        EMOJI_PATTERN (re.Pattern): Compiled regex pattern to match emojis.
        NON_STANDARD_PATTERN (re.Pattern): Compiled regex pattern to match non-standard characters.

    Methods:
        clean(text: str) -> Tuple[str, dict]:
            Cleans the input text by removing URLs, emojis, and non-standard characters.
            Returns a tuple containing the cleaned text and a dictionary with lists of removed items:
                - 'urls': List of URLs removed from the text.
                - 'emojis': List of emojis removed from the text.
                - 'non_standard': List of non-standard characters removed from the text.
    """

    URL_PATTERN = re.compile(r"https?://\S+|www\.\S+")
    EMOJI_PATTERN = re.compile(
        "["
        "\U0001f600-\U0001f64f"  # emoticons
        "\U0001f300-\U0001f5ff"  # symbols & pictographs
        "\U0001f680-\U0001f6ff"  # transport & map symbols
        "\U0001f1e0-\U0001f1ff"  # flags (iOS)
        "\U00002700-\U000027bf"  # Dingbats
        "\U000024c2-\U0001f251"
        "]+",
        flags=re.UNICODE,
    )
    NON_STANDARD_PATTERN = re.compile(
        r"[^A-Za-z0-9\s" + re.escape(string.punctuation) + "]"
    )

    def __init__(self, extract_urls: bool = True, extract_emojis: bool = True):
        """
        Initializes the TextCleaner with options to extract URLs and emojis.

        Args:
            extract_urls (bool): If True, URLs will be extracted and removed from the text.
            extract_emojis (bool): If True, emojis will be extracted and removed from the text.
        """
        self.extract_urls = extract_urls
        self.extract_emojis = extract_emojis

    def clean(self, text: str):
        """
        Cleans the input text by removing URLs, emojis, and non-standard characters.

        Args:
            text (str): The input string to be cleaned.

        Returns:
            Tuple[str, dict]: A tuple containing the cleaned text and a dictionary with lists of removed elements:
                - 'urls': List of URLs removed from the text.
                - 'emojis': List of emojis removed from the text.
                - 'non_standard': List of non-standard characters removed from the text.
        """
        removed = {
            "urls": self.URL_PATTERN.findall(text),
            "emojis": self.EMOJI_PATTERN.findall(text),
            "non_standard": self.NON_STANDARD_PATTERN.findall(text),
        }
        if self.extract_urls:
            text = self.URL_PATTERN.sub("", text)

        if self.extract_emojis:
            text = self.EMOJI_PATTERN.sub("", text)

        # text = self.NON_STANDARD_PATTERN.sub("", text)
        text = " ".join(text.split())
        return text, removed


# Example usage:
if __name__ == "__main__":
    cleaner = TextCleaner()
    sample_text = "Check this out! https://example.com 😊 #awesome @user"

    cleaned_text, removed_items = cleaner.clean(sample_text)

    print("Original Text:", sample_text)
    print("Cleaned Text:", cleaned_text)
    print("Removed Items:", removed_items)
