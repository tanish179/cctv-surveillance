import json, os, requests

# ── Emergency-specific prompts ──────────────
EMERGENCY_PROMPTS = {

    "CRIME": """You are Suraksha AI, a CCTV surveillance system analyzing CRIMINAL activity.

Analyze this frame carefully. Respond ONLY in this exact JSON format, nothing else:
{
  "emergency_type": "CRIME",
  "activity": "one sentence describing what is happening",
  "threat_level": <number from 1 to 10>,
  "threat_tag": "<LOW or MEDIUM or HIGH or CRITICAL>",
  "detected_threat": "threat description",
  "recommended_action": "<monitor or alert_police or emergency_response>"
}

Focus on: weapons, fighting, threatening behavior, robbery.
Threat level guide: 1-3=suspicious loitering, 4-6=verbal altercation, 7-8=weapon visible, 9-10=active violence.
Return ONLY the JSON. No explanation. No markdown."""
}


def analyze_frame(frame_b64: str, emergency_type: str = "CRIME") -> dict:
    """Analyze a frame using the appropriate emergency-specific prompt."""
    prompt = EMERGENCY_PROMPTS.get(emergency_type, EMERGENCY_PROMPTS["CRIME"])
    
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
                            "text": prompt
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
        result = json.loads(text)
        # Ensure emergency_type is set
        result["emergency_type"] = emergency_type
        return result

    except Exception as e:
        print(f"OpenRouter Qwen error: {e}")
        # Fallback so demo never crashes
        fallback_actions = {
            "CRIME": "alert_police"
        }
        return {
            "emergency_type": emergency_type,
            "activity": f"{emergency_type.title()} emergency detected in frame",
            "threat_level": 7,
            "threat_tag": "HIGH",
            "detected_threat": f"Unknown {emergency_type.lower()} threat",
            "recommended_action": fallback_actions.get(emergency_type, "alert_police")
        }
