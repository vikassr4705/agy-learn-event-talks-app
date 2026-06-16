import flask
from flask import Flask, jsonify, render_template, request
import feedparser
import requests
import html

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        # Fetch the feed
        feed = feedparser.parse(FEED_URL)
        
        # Check if parsing was successful
        if feed.bozo:
            print(f"Feed parser bozo exception: {feed.bozo_exception}")
            
        releases = []
        for entry in feed.entries:
            # Extract content
            content_val = ""
            if 'content' in entry:
                # content is usually a list of dicts
                content_val = entry.content[0].value
            elif 'summary' in entry:
                content_val = entry.summary
                
            # Date formatting
            updated = entry.get('updated', '')
            published = entry.get('published', '')
            date_str = updated or published
            
            # Category / tags
            category = "BigQuery"
            if 'tags' in entry and entry.tags:
                category = ", ".join([t.term for t in entry.tags])
            
            releases.append({
                'id': entry.get('id', ''),
                'title': entry.get('title', 'BigQuery Update'),
                'link': entry.get('link', ''),
                'date': date_str,
                'content': content_val,
                'category': category
            })
            
        return jsonify({
            'status': 'success',
            'feed_title': feed.feed.get('title', 'BigQuery Release Notes'),
            'feed_subtitle': feed.feed.get('subtitle', 'Latest updates and releases for Google Cloud BigQuery'),
            'releases': releases
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
