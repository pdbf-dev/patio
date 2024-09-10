import os
import time
import json
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.secret_key = 'supersecretkey'

# Ensure the upload folder exists
if not os.path.exists(app.config['UPLOAD_FOLDER']):
    os.makedirs(app.config['UPLOAD_FOLDER'])


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload():
    if 'script_file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['script_file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file and file.filename.endswith('.json'):
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)
        with open(filepath, 'r') as f:
            script = json.load(f)
        return jsonify({'script': script, 'filename': file.filename}), 200
    else:
        return jsonify({'error': 'Invalid file type. Only JSON files are accepted.'}), 400


@app.route('/submit_scores', methods=['POST'])
def submit_scores():
    data = request.json
    scores = data.get('scores')
    script_title = data.get('script_title')
    
    # Generate filename with timestamp
    timestamp = int(time.time())
    filename = f"{script_title}-test_{timestamp}.json"
    output_filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    # Save scores to file
    with open(output_filepath, 'w') as f:
        json.dump(scores, f)
    
    return jsonify({'message': 'Scores saved successfully', 'filename': filename}), 200


if __name__ == '__main__':
    app.run(debug=True)
