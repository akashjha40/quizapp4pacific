import sqlite3
import json
import os
import traceback
from flask import Flask, render_template, request, jsonify

# --- App Setup ---
app = Flask(__name__)
# Allow configuring secret key and DB path via environment variables
app.secret_key = os.environ.get('SECRET_KEY', 'your_very_secret_key')
DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'scores.db'))

# Enable debug mode and logging
app.debug = True
app.logger.setLevel('DEBUG')

# --- Helper Functions ---
def get_teams():
    """Loads team names from questions.json, with a fallback to default teams."""
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            teams = data.get('teams', [])
            if teams:
                return teams
    except (FileNotFoundError, json.JSONDecodeError):
        pass  # Fallback to default if file is missing or corrupt
    return ["Alpha", "Bravo", "Charlie", "Delta"]

def init_db():
    """Initializes the database and scores table."""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('CREATE TABLE IF NOT EXISTS scores (team TEXT PRIMARY KEY, score INTEGER NOT NULL DEFAULT 0)')
        teams = get_teams()
        for team in teams:
            c.execute('INSERT OR IGNORE INTO scores (team, score) VALUES (?, 0)', (team,))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error initializing database: {e}")
        traceback.print_exc()

# --- API Endpoints ---
@app.route('/api/questions')
def get_questions():
    """Serve the questions data from questions.json file."""
    try:
        print("Reading questions.json...")  # Debug log
        with open('questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Successfully read questions.json. Found {len(data.get('rounds', []))} rounds")  # Debug log
            return jsonify(data)
    except FileNotFoundError as e:
        print(f"Error: questions.json not found: {e}")  # Debug log
        return jsonify({"error": "Questions file not found"}), 404
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in questions.json: {e}")  # Debug log
        return jsonify({"error": "Invalid JSON file"}), 500

@app.route('/api/scores', methods=['GET', 'POST'])
def api_scores():
    """API to get all scores or update a single team's score."""
    if request.method == 'POST':
        try:
            data = request.json
            team = data.get('team')
            points = int(data.get('points', 0))
            
            if not team or team not in get_teams():
                return jsonify({'status': 'error', 'message': 'Invalid team'}), 400

            conn = sqlite3.connect(DB_PATH)
            c = conn.cursor()
            c.execute('UPDATE scores SET score = score + ? WHERE team = ?', (points, team))
            conn.commit()
            conn.close()
            return jsonify({'status': 'success', 'scores': get_all_scores()})
        except Exception as e:
            print(f"Error in POST /api/scores: {e}")
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': 'Server error updating score'}), 500
    
    # GET request
    return jsonify(get_all_scores())

def get_all_scores():
    """Fetches all team scores from the database."""
    scores = {team: 0 for team in get_teams()}
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('SELECT team, score FROM scores')
        for row in c.fetchall():
            scores[row[0]] = row[1]
        conn.close()
    except Exception as e:
        print(f"Error getting all scores: {e}")
        traceback.print_exc()
    return scores

@app.route('/api/reset_scores', methods=['POST'])
def api_reset_scores():
    """Resets all team scores to zero."""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('UPDATE scores SET score = 0')
        conn.commit()
        conn.close()
        print("All team scores have been reset to 0.")
        return jsonify({'status': 'success', 'scores': get_all_scores()})
    except Exception as e:
        print(f"Error in /api/reset_scores: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': 'Failed to reset scores on server'}), 500

@app.route('/api/questions/save', methods=['POST'])
def api_save_questions():
    """API to save the questions file."""
    if request.method == 'POST':
        try:
            data = request.json
            with open('questions.json', 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            return jsonify({'status': 'success'})
        except Exception as e:
            return jsonify({'status': 'error', 'message': str(e)}), 500
    else:
        try:
            with open('questions.json', 'r', encoding='utf-8') as f:
                return jsonify(json.load(f))
        except (FileNotFoundError, json.JSONDecodeError):
            # Fallback to empty rounds with detected teams if file is missing or corrupted
            return jsonify({'teams': get_teams(), 'rounds': []})

@app.route('/api/rounds', methods=['GET'])
def api_rounds():
    """API to get a simplified list of rounds and topics."""
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        rounds = data.get('rounds', [])
        result = []
        for rnd in rounds:
            entry = {'name': rnd.get('name'), 'type': rnd.get('type')}
            if rnd.get('type') == 'topic':
                entry['topics'] = [t['name'] for t in rnd.get('topics', [])]
            result.append(entry)
        return jsonify(result)
    except (FileNotFoundError, json.JSONDecodeError):
        return jsonify([])

@app.route('/api/rounds')
    # ...existing code...

# --- HTML Routes ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/host')
def host_dashboard():
    return render_template('host.html')

@app.route('/public')
def public_view():
    return render_template('public.html')

@app.route('/debug/questions')
def debug_questions():
    """Debug endpoint to check questions.json content."""
    try:
        with open('questions.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            return jsonify({
                "fileExists": True,
                "validJson": True,
                "rounds": len(data.get('rounds', [])),
                "teams": data.get('teams', []),
                "firstRound": data.get('rounds', [])[0] if data.get('rounds') else None
            })
    except FileNotFoundError:
        return jsonify({"fileExists": False, "error": "File not found"})
    except json.JSONDecodeError as e:
        return jsonify({"fileExists": True, "validJson": False, "error": str(e)})

# --- Main Execution ---
if __name__ == '__main__':
    import os
    print(f"[DEBUG] Current working directory: {os.getcwd()}")
    print(f"[DEBUG] Flask template folder: {app.template_folder}")
    init_db()  # Initialize DB on startup
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '5000'))
    app.run(host=host, port=port, debug=True)
