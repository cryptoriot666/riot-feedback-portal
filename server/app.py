from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import uuid
from datetime import datetime

app = Flask(__name__, static_folder='../public')
CORS(app)

SUBMISSIONS_DIR = os.path.join(os.path.dirname(__file__), '..', 'submissions')
os.makedirs(SUBMISSIONS_DIR, exist_ok=True)

# In-memory store (dev mode). Production: read from Walrus aggregator
submissions_cache = []

def load_local_submissions():
    """Load all JSON files from submissions folder"""
    subs = []
    if not os.path.exists(SUBMISSIONS_DIR):
        return subs
    for fname in sorted(os.listdir(SUBMISSIONS_DIR), reverse=True):
        if not fname.endswith('.json'):
            continue
        fpath = os.path.join(SUBMISSIONS_DIR, fname)
        try:
            with open(fpath, 'r') as f:
                data = json.load(f)
                subs.append(data)
        except Exception:
            continue
    return subs

@app.route('/')
def index():
    return send_from_directory('../public', 'index.html')

@app.route('/admin.html')
def admin():
    return send_from_directory('../public', 'admin.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('../public', path)

@app.route('/api/submit', methods=['POST'])
def submit_feedback():
    """Receive feedback, store locally + attempt Walrus upload"""
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({"success": False, "error": "Invalid JSON"}), 400

    # Validate required fields
    required = ['project', 'type', 'priority', 'message']
    for field in required:
        if not data.get(field):
            return jsonify({"success": False, "error": f"Missing field: {field}"}), 400

    # Enrich data
    submission = {
        "id": str(uuid.uuid4()),
        "project": data.get('project', '').strip(),
        "type": data.get('type', 'general'),
        "priority": data.get('priority', 'medium'),
        "message": data.get('message', '').strip(),
        "contact": data.get('contact', '').strip(),
        "encrypt": bool(data.get('encrypt', False)),
        "timestamp": data.get('timestamp', datetime.utcnow().isoformat()),
        "blobId": None,
        "walrusStatus": "pending"
    }

    # Save locally first
    filename = f"feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{submission['id'][:8]}.json"
    filepath = os.path.join(SUBMISSIONS_DIR, filename)

    try:
        with open(filepath, 'w') as f:
            json.dump(submission, f, indent=2)
    except Exception as e:
        return jsonify({"success": False, "error": f"Local save failed: {str(e)}"}), 500

    # Attempt Walrus upload (best effort — don't fail if CLI not ready)
    try:
        from walrus_submit import upload_to_walrus
        blob_id = upload_to_walrus(filepath, submission['id'])
        if blob_id:
            submission['blobId'] = blob_id
            submission['walrusStatus'] = 'stored'
            # Update local file with blob ID
            with open(filepath, 'w') as f:
                json.dump(submission, f, indent=2)
    except Exception as e:
        submission['walrusStatus'] = f'local_only: {str(e)}'
        # Still return success — local storage works, Walrus is bonus

    # Refresh cache
    global submissions_cache
    submissions_cache = load_local_submissions()

    return jsonify({
        "success": True,
        "blobId": submission['blobId'] or f"local_{submission['id']}",
        "message": "Feedback stored",
        "walrusStatus": submission['walrusStatus']
    })

@app.route('/api/submissions', methods=['GET'])
def get_submissions():
    """Return all submissions (latest first)"""
    subs = load_local_submissions()
    return jsonify(subs)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "riot-feedback-portal"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
