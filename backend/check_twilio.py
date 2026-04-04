import os
from dotenv import load_dotenv
from twilio.rest import Client

load_dotenv()

client = Client(os.getenv("TWILIO_SID"), os.getenv("TWILIO_TOKEN"))
messages = client.messages.list(limit=2)
for m in messages:
    print(f"To: {m.to}, Status: {m.status}, Body: {m.body}, Error: {m.error_message}")
