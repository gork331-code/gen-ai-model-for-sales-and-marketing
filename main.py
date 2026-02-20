from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import time
import google.generativeai as genai
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///nexusai.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
CORS(app)  # Enable CORS for all routes

# Define Database Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)

with app.app_context():
    db.create_all()


# Configure Gemini API
genai.configure(api_key="AIzaSyBAxIyhKoNxj_FYpi6mBe1Aa1w856GzRzw")
model = genai.GenerativeModel('gemini-2.5-flash')
chat_session = model.start_chat(history=[])


# Mock Data
LEADS = [
    { "id": 1, "name": "Sarah Chen", "company": "TechVision Inc.", "email": "sarah@techvision.io", "score": 94, "status": "active", "source": "LinkedIn", "value": "$125,000", "lastActivity": "2 hours ago", "color": "#a78bfa", "initials": "SC" },
    { "id": 2, "name": "Marcus Johnson", "company": "DataFlow Corp", "email": "marcus@dataflow.com", "score": 87, "status": "active", "source": "Website", "value": "$89,000", "lastActivity": "5 hours ago", "color": "#06b6d4", "initials": "MJ" },
    { "id": 3, "name": "Elena Rodriguez", "company": "CloudScale Ltd", "email": "elena@cloudscale.co", "score": 78, "status": "pending", "source": "Referral", "value": "$210,000", "lastActivity": "1 day ago", "color": "#34d399", "initials": "ER" },
    { "id": 4, "name": "James Wright", "company": "InnovateTech", "email": "james@innovatetech.io", "score": 65, "status": "active", "source": "Google Ads", "value": "$56,000", "lastActivity": "3 days ago", "color": "#fbbf24", "initials": "JW" },
    { "id": 5, "name": "Priya Patel", "company": "GrowthEngine", "email": "priya@growthengine.com", "score": 91, "status": "active", "source": "Conference", "value": "$175,000", "lastActivity": "6 hours ago", "color": "#fb7185", "initials": "PP" },
    { "id": 6, "name": "David Kim", "company": "NextWave AI", "email": "david@nextwave.ai", "score": 43, "status": "inactive", "source": "Cold Email", "value": "$34,000", "lastActivity": "2 weeks ago", "color": "#60a5fa", "initials": "DK" },
    { "id": 7, "name": "Olivia Brown", "company": "MarketPulse", "email": "olivia@marketpulse.io", "score": 82, "status": "active", "source": "Webinar", "value": "$98,000", "lastActivity": "12 hours ago", "color": "#a78bfa", "initials": "OB" },
    { "id": 8, "name": "Ahmed Hassan", "company": "ScaleUp Solutions", "email": "ahmed@scaleup.com", "score": 56, "status": "pending", "source": "LinkedIn", "value": "$67,000", "lastActivity": "4 days ago", "color": "#06b6d4", "initials": "AH" },
]

CAMPAIGNS = [
    { "id": 1, "name": "Q1 Product Launch", "channel": "Multi-channel", "status": "live", "impressions": "2.4M", "clicks": "156K", "conversions": 4820, "roi": "+284%", "progress": 78 },
    { "id": 2, "name": "LinkedIn ABM Campaign", "channel": "LinkedIn", "status": "live", "impressions": "890K", "clicks": "45K", "conversions": 1250, "roi": "+195%", "progress": 62 },
    { "id": 3, "name": "Google Search — Enterprise", "channel": "Google Ads", "status": "paused", "impressions": "1.1M", "clicks": "78K", "conversions": 2100, "roi": "+152%", "progress": 45 },
    { "id": 4, "name": "Email Nurture Series", "channel": "Email", "status": "live", "impressions": "340K", "clicks": "28K", "conversions": 890, "roi": "+320%", "progress": 91 },
    { "id": 5, "name": "Holiday Retargeting", "channel": "Display", "status": "ended", "impressions": "3.2M", "clicks": "210K", "conversions": 5600, "roi": "+178%", "progress": 100 },
    { "id": 6, "name": "Webinar Awareness", "channel": "Social", "status": "live", "impressions": "560K", "clicks": "32K", "conversions": 720, "roi": "+210%", "progress": 55 },
]

ACTIVITIES = [
    { "text": "<strong>Sarah Chen</strong> opened the proposal email", "time": "2 min ago", "dot": "violet" },
    { "text": "<strong>AI Assistant</strong> updated 12 lead scores", "time": "15 min ago", "dot": "cyan" },
    { "text": "<strong>Q1 Product Launch</strong> hit 2M impressions", "time": "1 hour ago", "dot": "emerald" },
    { "text": "<strong>Marcus Johnson</strong> scheduled a demo call", "time": "2 hours ago", "dot": "amber" },
    { "text": "<strong>Email Nurture</strong> conversion rate up to 8.2%", "time": "3 hours ago", "dot": "rose" },
    { "text": "<strong>Priya Patel</strong> downloaded the whitepaper", "time": "5 hours ago", "dot": "violet" },
]

AI_RESPONSES = {
    "Summarize this week's leads": "Here's your **weekly lead summary**:\n\n📊 **12 new leads** captured this week, up 18% from last week.\n\nTop leads by AI score:\n- **Sarah Chen** (TechVision) — Score: 94, Deal Value: $125K\n- **Priya Patel** (GrowthEngine) — Score: 91, Value: $175K\n- **Marcus Johnson** (DataFlow) — Score: 87, Value: $89K\n\n🔥 **3 leads** are in the \"hot\" category (score > 85) and should be prioritized for outreach this week.\n\n💡 **Recommendation:** Focus on Sarah Chen — she opened the proposal email twice today and visited your pricing page.",
    "Draft a follow-up email": "Here's a **follow-up email** draft for your top lead:\n\n---\n\n**Subject:** Quick follow-up on our conversation\n\nHi Sarah,\n\nThank you for taking the time to review our proposal. I noticed you've been exploring our enterprise features, and I wanted to share a few additional resources that might help:\n\n1. **Case Study:** How TechVision's competitor saved 40% on operations\n2. **ROI Calculator:** Customized for your team size\n3. **Live Demo:** Available this Thursday at 2 PM\n\nWould any of these be helpful? I'd love to schedule a brief call to address any questions.\n\nBest regards,\nKarthik",
    "Campaign performance overview": "Here's your **campaign performance overview**:\n\n📈 **Overall Performance:**\n- Total Impressions: **8.49M** (+23% MoM)\n- Total Clicks: **549K** (6.5% CTR)\n- Total Conversions: **15,380**\n- Average ROI: **+223%**\n\n🏆 **Top Performer:** Email Nurture Series (+320% ROI)\n📉 **Needs Attention:** Google Search Enterprise (paused, declining CTR)\n\n💡 **AI Recommendation:** Reallocate 15% of Google Search budget to LinkedIn ABM — the cost per acquisition is 40% lower there.",
    "default": "I've analyzed the data and here are my insights:\n\n📊 Your sales pipeline is healthy with **$854K** in total pipeline value across **8 active leads**.\n\n🎯 **Key Actions:**\n1. Follow up with Sarah Chen — highest engagement this week\n2. Re-engage David Kim — score dropped 15 points\n3. Schedule demos for 3 hot leads\n\n💡 I can help you draft personalized outreach, analyze specific campaigns, or generate content. What would you like to focus on?"
}

GENERATED_CONTENT = {
    "email": {
        "title": "Re-engagement Email — Enterprise Demo Invitation",
        "content": "<h4>Subject: Unlock 3x Revenue Growth — Exclusive Demo for {{company}}</h4>\n<p>Hi {{name}},</p>\n<p>I hope this message finds you well. I'm reaching out because companies like {{company}} in the {{industry}} space are seeing remarkable results with our AI-powered platform:</p>\n<p><strong>🚀 Key Results Our Clients Achieve:</strong></p>\n<p>• 3.2x increase in qualified lead conversion<br>• 47% reduction in customer acquisition cost<br>• 89% improvement in sales team productivity</p>\n<p>I'd love to show you a personalized demo tailored to {{company}}'s specific needs. We've prepared a custom ROI analysis based on your industry benchmarks.</p>\n<p><strong>Would next Tuesday at 2 PM work for a 20-minute walkthrough?</strong></p>\n<p>Looking forward to connecting,<br>Karthik S.<br>Sales Director, NexusAI</p>"
    },
    "social": {
        "title": "LinkedIn Thought Leadership Post",
        "content": "<h4>🚀 The Future of Sales Intelligence is Here</h4>\n<p>After analyzing 10,000+ sales interactions, we discovered something surprising:</p>\n<p><strong>The #1 predictor of deal closure isn't price — it's timing.</strong></p>\n<p>Here's what AI-powered lead scoring revealed:</p>\n<p>📊 Leads contacted within 2 hours of peak engagement are <strong>340% more likely</strong> to convert.<br>🎯 Personalized outreach based on behavioral data increases response rates by <strong>67%</strong>.<br>💡 AI-identified buying signals predict deal closure with <strong>89% accuracy</strong>.</p>\n<p>The sales teams winning in 2026 aren't working harder — they're working smarter with AI intelligence.</p>\n<p>What's your experience with AI in sales? Drop your thoughts below 👇</p>\n<p><em>#SalesIntelligence #AI #B2BSales #MarTech #FutureOfSales</em></p>"
    },
    "blog": {
        "title": "Blog Outline: 10 AI Strategies for B2B Sales Teams",
        "content": "<h4>10 AI Strategies That Top B2B Sales Teams Use in 2026</h4>\n<p><strong>Introduction:</strong> The AI revolution in sales is no longer coming — it's here. Here's how leading teams are leveraging it.</p>\n<p><strong>1. Predictive Lead Scoring</strong><br>How AI analyzes 50+ signals to prioritize your hottest leads automatically.</p>\n<p><strong>2. Behavioral Intent Analysis</strong><br>Tracking website visits, email opens, and content downloads to predict buying intent.</p>\n<p><strong>3. Automated Personalization at Scale</strong><br>Crafting unique messaging for thousands of prospects simultaneously.</p>\n<p><strong>4. Conversation Intelligence</strong><br>AI-powered call analysis that identifies winning patterns and coaching opportunities.</p>\n<p><strong>5. Dynamic Pricing Optimization</strong><br>Real-time pricing adjustments based on deal probability and competitive analysis.</p>\n<p><em>... [6-10 continue with similar depth]</em></p>\n<p><strong>Conclusion:</strong> The gap between AI-adopters and laggards is widening. Start with these strategies today.</p>"
    },
    "ad": {
        "title": "Google Ads Copy — Enterprise SaaS",
        "content": "<h4>Ad Group: AI Sales Intelligence Platform</h4>\n<p><strong>Headline 1:</strong> AI-Powered Sales Intelligence | 3x Your Conversion Rate</p>\n<p><strong>Headline 2:</strong> Stop Guessing, Start Closing | Smart Lead Scoring</p>\n<p><strong>Headline 3:</strong> 14-Day Free Trial | No Credit Card Required</p>\n<p><strong>Description 1:</strong> Transform your sales pipeline with AI that scores leads, predicts deal outcomes, and automates personalized outreach. Trusted by 500+ enterprise teams. Get started free.</p>\n<p><strong>Description 2:</strong> Why chase cold leads? Our AI identifies your hottest prospects and tells you exactly when and how to reach out. See 284% ROI in 90 days. Book a demo today.</p>\n<p><strong>Sitelinks:</strong></p>\n<p>• See Pricing Plans → /pricing<br>• Customer Success Stories → /case-studies<br>• Book a Live Demo → /demo<br>• AI ROI Calculator → /roi-calculator</p>"
    }
}

@app.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    return jsonify({"activities": ACTIVITIES})

@app.route("/api/leads", methods=["GET"])
def get_leads():
    return jsonify({"leads": LEADS})

@app.route("/api/campaigns", methods=["GET"])
def get_campaigns():
    return jsonify({"campaigns": CAMPAIGNS})

@app.route("/api/chat", methods=["POST"])
def post_chat():
    data = request.json
    user_text = data.get("message", "")
    
    # Context setting prompt
    context = """
    You are an AI Sales Assistant for the NexusAI Generative AI-Powered Sales & Marketing Intelligence Platform.
    You analyze lead & pipeline data, draft personalized outreach, provide campaign performance insights, and make strategic recommendations.
    Always format your response with markdown (e.g. bolding, bullet points) and try to use emojis where appropriate.
    Keep your responses concise, helpful, and professional.
    """
    
    try:
        response = chat_session.send_message(f"Context: {context}\nUser Request: {user_text}")
        return jsonify({"response": response.text})
    except Exception as e:
        print(f"Error from Gemini API: {e}")
        return jsonify({"response": "I'm sorry, I'm having trouble connecting to my AI core right now. Please try again later."})


@app.route("/api/content/generate", methods=["POST"])
def generate_content():
    data = request.json
    template = data.get("template", "email")
    product = data.get("product", "")
    audience = data.get("audience", "")
    tone = data.get("tone", "")
    message = data.get("message", "")
    
    # Prompt for content generation
    prompt = f"""
    You are an expert marketing copywriter for NexusAI platform.
    Please generate a {template} for the product "{product}" targeting "{audience}".
    The tone should be {tone}.
    Additional details/message to include: {message}
    
    Must return a JSON object with this exact structure:
    {{
        "title": "Title of the content",
        "content": "The generated content itself, formatted nicely with HTML tags (like <h4>, <p>, <strong>, <br>). Start the content immediately without markdown codeblocks wrapper."
    }}
    Ensure your response is valid JSON and strictly follows the schema. Do not include markdown like ```json at the beginning or end of your string.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Remove markdown JSON wrappers if Gemini accidentally includes them
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        result = json.loads(text.strip())
        return jsonify({
            "title": result.get("title", f"Generated {template}"),
            "content": result.get("content", "Content generation failed formatting.")
        })
    except Exception as e:
        print(f"Error from Gemini API: {e}")
        return jsonify({
            "title": "Generation Error",
            "content": "<p>Sorry, I encountered an error generating the content. Please try again.</p>"
        })


@app.route("/api/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already exists"}), 400
        
    new_user = User(
        username=username, 
        password_hash=generate_password_hash(password)
    )
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Registration successful"})

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password_hash, password):
        return jsonify({"success": True, "message": "Login successful", "username": username})
        
    return jsonify({"success": False, "message": "Invalid username or password"}), 401


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)

