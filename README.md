# College Quiz Competition Web App

A responsive Flask web app for running a multi-round college quiz competition with 4 teams, manual/admin question entry, multimedia support, live scoring, and accessible UI using Tailwind CSS.

## Features
- 3 rounds: Topic (MCQ), Multimedia (audio/image), Common (all teams)
- 4 fixed teams, team-by-team question flow
- Manual question entry via JSON or admin UI
- Timers per question, host controls
- Multimedia support (audio/image questions)
- Live scoring, manual score adjustment
- Repeatable rounds (loop)
- Host dashboard and public view
- Responsive, accessible design

## Tech Stack
- Python 3.x
- Flask
- Tailwind CSS
- HTML/CSS/JS

## Setup
1. Create a Python virtual environment:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```
2. Install dependencies:
   ```powershell
   pip install flask
   ```
3. Run the app:
   ```powershell
   flask run
   ```

## JSON Schema Example
```json
{
  "rounds": [
    {
      "name": "Round 1",
      "type": "topic",
      "topics": [
        {
          "name": "Science",
          "questions": [
            {
              "question": "What is the boiling point of water?",
              "options": ["90°C", "100°C", "110°C", "120°C"],
              "answer": 1,
              "points": 10,
              "timer": 30
            }
          ]
        }
      ]
    },
    {
      "name": "Round 2",
      "type": "multimedia",
      "questions": [
        {
          "question": "Identify the sound.",
          "audio": "audio_url.mp3",
          "answer": "Bell",
          "points": 15,
          "timer": 30
        },
        {
          "question": "What is shown in the image?",
          "image": "image_url.jpg",
          "answer": "Solar Panel",
          "points": 15,
          "timer": 30
        }
      ]
    },
    {
      "name": "Round 3",
      "type": "common",
      "questions": [
        {
          "question": "Who is the current president of India?",
          "options": ["A", "B", "C", "D"],
          "answer": 2,
          "points": 20,
          "timer": 45
        }
      ]
    }
  ]
}
```

## Accessibility
- Keyboard navigation
- Readable colors
- Alt text for images
- Captions/transcripts for audio

---
Replace media URLs and questions with your own content as needed.
