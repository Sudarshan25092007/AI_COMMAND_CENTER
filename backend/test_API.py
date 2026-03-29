import os
from openai import OpenAI

# Load API key from environment variable — never hardcode secrets!
client = OpenAI(
  api_key=os.getenv("OPENAI_API_KEY", "YOUR_API_KEY_HERE")
)

response = client.responses.create(
  model="gpt-5-nano",
  input="write a haiku about ai",
  store=True,
)

print(response.output_text)
