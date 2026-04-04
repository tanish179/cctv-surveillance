import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

try:
    print("Sending via Twilio...")
    client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
    msg = client.messages.create(
        from_="whatsapp:+14155238886",
        to="whatsapp:" + os.getenv("POLICE_NUMBER"),
        body="🚨 Test Message from Suraksha AI 🚨"
    )
    print(f"Success! SID: {msg.sid}")
except Exception as e:
    print(f"Error: {e}")
