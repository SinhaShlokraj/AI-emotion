MENTAL_HEALTH_TIPS = {
    "happy": {
        "message": "You're feeling great! 😊 Keep spreading that positive energy.",
        "color": "#FFD700",
        "emoji": "😊",
        "tips": [
            "Share your happiness with friends and family — positivity is contagious!",
            "Use this energy to pursue a creative project or hobby.",
            "Practice gratitude journaling to extend your positive mood.",
            "Engage in physical activity to reinforce those feel-good hormones.",
            "Help someone else — acts of kindness amplify your own happiness."
        ],
        "resources": [
            "Practice mindfulness to stay in the present moment",
            "Consider volunteering or community service",
            "Set new personal goals while you have momentum"
        ]
    },
    "sad": {
        "message": "It's okay to feel sad. Be kind to yourself today. 💙",
        "color": "#6495ED",
        "emoji": "😢",
        "tips": [
            "Reach out to a trusted friend or family member and talk about how you feel.",
            "Practice gentle self-care: warm tea, a cozy blanket, or a short walk.",
            "Write in a journal — expressing your feelings can be deeply healing.",
            "Avoid isolating yourself; connection is key to emotional recovery.",
            "Consider speaking to a mental health professional if sadness persists."
        ],
        "resources": [
            "Try the 5-4-3-2-1 grounding technique to stay present",
            "Listen to uplifting music or watch a comforting movie",
            "iCall Helpline (India): 9152987821"
        ]
    },
    "angry": {
        "message": "Anger is valid. Let's channel it constructively. 🔥",
        "color": "#FF6B6B",
        "emoji": "😠",
        "tips": [
            "Take 10 deep, slow breaths before reacting to any situation.",
            "Step away from the triggering situation and give yourself space.",
            "Exercise — a run or workout is a powerful way to release anger.",
            "Try progressive muscle relaxation to release physical tension.",
            "Identify the root cause of your anger when you feel calmer."
        ],
        "resources": [
            "Practice the STOP technique: Stop, Take a breath, Observe, Proceed",
            "Anger journaling can help identify patterns and triggers",
            "Consider cognitive behavioral therapy (CBT) for anger management"
        ]
    },
    "fear": {
        "message": "You're safe. Fear is temporary and you can overcome it. 🌟",
        "color": "#9B59B6",
        "emoji": "😨",
        "tips": [
            "Use box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s.",
            "Ground yourself by naming 5 things you can see around you.",
            "Challenge fear-based thoughts — ask 'Is this thought realistic?'",
            "Gradually expose yourself to what you fear in small, safe steps.",
            "Seek support from a trusted person or mental health professional."
        ],
        "resources": [
            "Practice mindfulness meditation daily to reduce anxiety",
            "NIMHANS Helpline: 080-46110007",
            "Exposure therapy techniques can help with specific phobias"
        ]
    },
    "disgust": {
        "message": "Your feelings are valid. Let's work through this together. 🌿",
        "color": "#27AE60",
        "emoji": "🤢",
        "tips": [
            "Step away from whatever triggered the feeling and take fresh air.",
            "Wash your hands or face — physical cleansing can reset mentally.",
            "Practice non-judgmental self-awareness about your reactions.",
            "Explore cognitive reframing to shift your perspective.",
            "Discuss the source of your discomfort with someone you trust."
        ],
        "resources": [
            "Mindfulness can help you observe emotions without judgment",
            "Consider journaling about what triggered this feeling",
            "CBT techniques are effective for managing disgust-related distress"
        ]
    },
    "surprise": {
        "message": "Surprises keep life exciting! Take a moment to process. ✨",
        "color": "#F39C12",
        "emoji": "😲",
        "tips": [
            "Pause and take a few breaths before reacting.",
            "Give yourself time to process the unexpected information or event.",
            "Talk through the surprise with someone you trust.",
            "Ask yourself: 'Is this surprise good, bad, or neutral?'",
            "Embrace the unexpected — sometimes surprises lead to growth!"
        ],
        "resources": [
            "Adaptability is a key mental health skill — practice it daily",
            "Journaling about unexpected events builds emotional resilience",
            "Mindfulness helps you stay calm in the face of the unexpected"
        ]
    },
    "neutral": {
        "message": "Feeling balanced and steady — that's a great foundation! ⚖️",
        "color": "#95A5A6",
        "emoji": "😐",
        "tips": [
            "Use this calm state to practice mindfulness or meditation.",
            "Check in with your body — are there any subtle emotions present?",
            "Set intentions for the day while your mind is clear.",
            "Engage in a fulfilling activity to boost your sense of purpose.",
            "Connect with someone you care about to deepen your relationships."
        ],
        "resources": [
            "Try a body scan meditation to deepen self-awareness",
            "Use this grounded state to plan for upcoming challenges",
            "Regular exercise can help maintain emotional balance"
        ]
    }
}


def get_tips_for_emotion(emotion: str) -> dict:
    emotion = emotion.lower().strip()
    return MENTAL_HEALTH_TIPS.get(emotion, MENTAL_HEALTH_TIPS["neutral"])
