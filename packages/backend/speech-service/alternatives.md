# Speech-to-Text Service Alternatives

## 1. OpenAI Whisper API (Recommended)
**Cost**: $0.006/minute
**Pros**: Same quality as WhisperX, reliable, easy integration
**Cons**: Requires OpenAI account
**Best for**: General use, high accuracy needed

## 2. Deepgram API
**Cost**: $0.0043/minute (pay-as-you-go)
**Pros**: Real-time streaming, very fast, good for conversations
**Cons**: Slightly different API
**Best for**: Real-time transcription, phone calls

## 3. Assembly AI
**Cost**: $0.00037/second (~$0.022/minute)
**Pros**: Speaker detection, sentiment analysis, good accuracy
**Cons**: More expensive for basic use
**Best for**: Advanced features needed

## 4. Google Cloud Speech-to-Text
**Cost**: $0.004-0.024/minute (depending on model)
**Pros**: Very reliable, good multilingual support
**Cons**: More complex setup, GCP account required
**Best for**: Enterprise use, multilingual needs

## 5. Azure Speech Services
**Cost**: $0.01-0.04/minute
**Pros**: Good Windows integration, reliable
**Cons**: More expensive, Microsoft ecosystem
**Best for**: Microsoft-heavy environments

## 6. Vosk (Self-hosted, lightweight)
**Cost**: Free (your compute)
**Pros**: Runs locally, privacy, lightweight
**Cons**: Lower accuracy than cloud services
**Best for**: Privacy-sensitive applications

## Quick Integration Examples

### OpenAI (Current Implementation)
```python
files = {
    'file': ('audio.webm', audio_data, 'audio/webm'),
    'model': (None, 'whisper-1'),
}
response = await client.post("/audio/transcriptions", files=files)
```

### Deepgram
```python
headers = {"Authorization": f"Token {api_key}"}
response = await client.post(
    "https://api.deepgram.com/v1/listen",
    headers=headers,
    data=audio_data
)
```

### Assembly AI
```python
# 1. Upload audio
upload_response = await client.post(
    "https://api.assemblyai.com/v2/upload",
    headers={"authorization": api_key},
    data=audio_data
)

# 2. Start transcription
transcript_response = await client.post(
    "https://api.assemblyai.com/v2/transcript",
    headers={"authorization": api_key},
    json={"audio_url": upload_response.json()["upload_url"]}
)
``` 