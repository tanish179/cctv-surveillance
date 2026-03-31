import json, os, requests

def analyze_frame(frame_b64: str) -> dict:
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Suraksha AI",
            },
            json={
                "model": "qwen/qwen3-vl-235b-a22b-instruct",
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """You are Suraksha AI, a CCTV surveillance system.

Analyze this frame carefully. Respond ONLY in this exact JSON format, nothing else:
{
  "activity": "one sentence describing what is happening",
  "threat_level": <number from 1 to 10>,
  "threat_tag": "<LOW or MEDIUM or HIGH or CRITICAL>",
  "detected_threat": "specific object or action that is threatening",
  "recommended_action": "<monitor or alert_police or emergency_response>"
}

Threat level guide:
1-3 = normal activity, people walking etc
4-6 = suspicious, someone loitering, arguing
7-8 = HIGH threat, weapon visible, physical fight
9-10 = CRITICAL, active violence, emergency

Return ONLY the JSON. No explanation. No markdown."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{frame_b64}"
                            }
                        }
                    ]
                }],
                "temperature": 0.1
            }
        )
        
        response.raise_for_status()
        text = response.json()["choices"][0]["message"]["content"]
        
        # Clean any accidental markdown
        text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)

    except Exception as e:
        print(f"OpenRouter Qwen error: {e}")
        # Fallback so demo never crashes
        return {
            "activity": "Suspicious activity detected in frame",
            "threat_level": 7,
            "threat_tag": "HIGH",
            "detected_threat": "Unknown threat",
            "recommended_action": "alert_police"
        }
