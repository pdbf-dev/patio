document.getElementById('upload_button').addEventListener('click', function () {
    const fileInput = document.getElementById('script_file');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a file first.');
        return;
    }

    const formData = new FormData();
    formData.append('script_file', file);

    fetch('/upload', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
        } else {
            startScoring(data.script, data.filename);
        }
    });
});

let scores = {};
let currentPhase = 0; // Tracks current phase: 0 for title, 1 for text, 2 for scenes
let currentSceneIndex = 0; // Tracks the current scene index in the scenes array
let currentScenePart = 'narration'; // Tracks whether we're scoring narration or visual
let scriptData = null;
let scriptTitle = '';

function startScoring(script, filename) {
    scriptData = script;
    scriptTitle = script.title || filename;

    document.getElementById('upload_section').style.display = 'none';
    document.getElementById('scoring_section').style.display = 'block';
    document.getElementById('script_title').innerText = scriptTitle;

    displayNextContent();
}

function displayNextContent() {
    const contentDiv = document.getElementById('scoring_content');
    contentDiv.innerHTML = ''; // Clear previous content

    if (currentPhase === 0 && scriptData.title) {
        // Display the title for scoring
        contentDiv.innerText = `Title: ${scriptData.title}`;
    } else if (currentPhase === 1 && scriptData.text) {
        // Display the text for scoring if it exists
        contentDiv.innerText = `Text: ${scriptData.text}`;
    } else if (currentPhase === 1 && !scriptData.text) {
        // Skip text phase if no text is present and move to scenes phase
        currentPhase++; // Move to scenes phase directly
        displayNextContent();
        return;
    } else if (currentPhase === 2 && scriptData.scenes && currentSceneIndex < scriptData.scenes.length) {
        // We're in the scenes phase
        const scene = scriptData.scenes[currentSceneIndex];
        if (currentScenePart === 'narration') {
            // Display the narration of the current scene
            contentDiv.innerHTML = `<h3>Scene ${currentSceneIndex + 1} - Narration</h3><p>${scene.narration || 'N/A'}</p>`;
        } else if (currentScenePart === 'visual') {
            // Display the visual of the current scene
            contentDiv.innerHTML = `<h3>Scene ${currentSceneIndex + 1} - Visual</h3><p>${scene.visual || 'N/A'}</p>`;
        }
    } else {
        // All content has been scored, finish the process
        finishScoring();
        return;
    }

    // Attach click event listeners for the scoring buttons
    document.querySelectorAll('.score-btn').forEach(button => {
        button.onclick = function () {
            const score = this.getAttribute('data-score');
            saveScore(score);
        };
    });
}

function saveScore(score) {
    if (currentPhase === 0 && scriptData.title) {
        // Save the title score if title exists
        scores['title'] = parseInt(score);
        currentPhase++; // Move to the next phase (text or scenes)
    } else if (currentPhase === 1 && scriptData.text) {
        // Save the text score if text exists
        scores['text'] = parseInt(score);
        currentPhase++; // Move to the scenes phase
    } else if (currentPhase === 1 && !scriptData.text) {
        // If no text is present, skip the text phase and move to the scenes phase
        currentPhase++; // Move to scenes phase directly
        displayNextContent();
        return;
    } else if (currentPhase === 2 && scriptData.scenes && currentSceneIndex < scriptData.scenes.length) {
        const sceneKey = `scene_${currentSceneIndex + 1}`; // Create a key for this scene's score

        // Ensure the score dictionary for this scene exists
        if (!scores[sceneKey]) {
            scores[sceneKey] = {};
        }

        if (currentScenePart === 'narration') {
            // Save the narration score for the current scene
            scores[sceneKey]['narration'] = parseInt(score);
            currentScenePart = 'visual'; // Next, we'll score the visual part
        } else if (currentScenePart === 'visual') {
            // Save the visual score for the current scene
            scores[sceneKey]['visual'] = parseInt(score);
            currentSceneIndex++; // Move to the next scene
            currentScenePart = 'narration'; // Reset to narration for the next scene
        }
    }

    // Load the next content to score
    displayNextContent();
}

function finishScoring() {
    const scoreData = {
        scores: scores,
        script_title: scriptTitle
    };

    fetch('/submit_scores', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(scoreData)
    })
    .then(response => response.json())
    .then(data => {
        alert('Scoring complete! Scores saved to: ' + data.filename);
        location.reload(); // Reload the page to start over
    });
}
