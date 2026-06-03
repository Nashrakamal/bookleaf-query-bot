/**
 * BookLeaf Publishing — Customer Query Bot
 * Backend server: Express + OpenAI (or Claude) + Mock Supabase
 *
 * Stack: Node.js, Express, OpenAI SDK, dotenv
 * Run: npm install && node src/server.js
 */

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ─── Knowledge Base (FAQs from official BookLeaf KB document) ────────────────
const KNOWLEDGE_BASE = [
  {topic:"join_challenge",keywords:["join","21 day","writing challenge","sign up","register","how to join"],answer:"Register at https://www.bookleafpub.in/writing-challenge and pay ₹1999 (one-time). Includes: full book publishing (paperback + eBook), ISBN, cover design tool, layout, 80% royalty, one free author copy (India). No hidden charges."},
  {topic:"package_included",keywords:["1999","what's included","package includes","publishing package","what do i get"],answer:"The ₹1999 package includes: 21-day challenge, paperback + eBook publishing, ISBN & barcode, interior layout, cover design tool, 80% royalty, promotional materials, and one free author copy (Indian authors only)."},
  {topic:"genuine",keywords:["genuine","real","legit","scam","trust","authentic","shark tank"],answer:"BookLeaf is 100% legitimate — 16,000+ books published, 14,000+ authors, featured on Shark Tank India Season 4. 'Roots' by Rini Choudhury (published through this challenge) was launched at Rashtrapati Bhavan."},
  {topic:"pen_name",keywords:["pen name","pseudonym","fake name","alias"],answer:"Yes, pen names are fully supported. For copyright registration with a pen name, a notarized affidavit may be required — BookLeaf's team will guide you."},
  {topic:"no_poetry",keywords:["without challenge","other genres","standalone","just publish","not interested in poetry"],answer:"Currently BookLeaf exclusively offers the 21-Day Poetry Writing Challenge. Other genre publishing is temporarily unavailable. Visit https://www.bookleafpub.in/writing-challenge"},
  {topic:"language",keywords:["language","hindi","hinglish","regional","urdu","marathi","bengali","kannada","tamil"],answer:"Accepted: English, Hindi, Hinglish. Regional languages (Urdu, Marathi, Bengali, etc.) are not supported yet. For Hindi: use Google Input Tools and copy-paste into the dashboard."},
  {topic:"age",keywords:["age","minimum age","who can join"],answer:"No minimum or maximum age limit. Writers of all ages are welcome."},
  {topic:"returning_author",keywords:["participate again","returning","already published","join again","second time"],answer:"Returning authors are welcome — no limit on participation. Using same email? Your old dashboard stays active. Contact support to enable 'Add a New Book' button."},
  {topic:"refund",keywords:["refund","money back","cancel","14 days","change my mind"],answer:"No-questions-asked unconditional refund within 14 days of registration — even if poems are already submitted. No refund after the 14-day window."},
  {topic:"extension",keywords:["can't finish","21 days","extra time","extension","deadline"],answer:"Can't finish in 21 days? You get an automatic 7-day extension. Note: incomplete challenge does not qualify for a fee refund."},
  {topic:"addons",keywords:["add-on","addon","upgrade","expert publishing","services available"],answer:"4 add-on options:\n1. Global Distribution — ₹5,499 (Amazon 13 markets + B&N + Ingram)\n2. Emily Dickinson Award — ₹4,499\n3. Global Dist + Award + Copyright — ₹8,899\n4. Bestseller Breakthrough Package — ₹11,999 (all-inclusive)"},
  {topic:"bestseller_package",keywords:["bestseller breakthrough","11999","premium","personal manager","priority publishing"],answer:"Bestseller Breakthrough (₹11,999): Personal Publishing Manager, Priority Publishing (18–22 days), Global Amazon distribution, Flipkart, B&N, Ingram, 100% royalty, on-demand payout, copyright registration, 5 author copies (India), Amazon Prime placement, Emily Dickinson Award, marketing guides."},
  {topic:"award",keywords:["emily dickinson","award","4499","trophy","certificate","award fee"],answer:"The Emily Dickinson Award (₹4,499) includes trophy + certificate shipped to you, promotion, and recognition. Dispatched 45–60 business days after your book goes live. Fee covers administration, shipping, and promotion costs."},
  {topic:"global_dist",keywords:["global distribution","5499","8899","13 amazon","barnes noble","ingram"],answer:"Global Distribution (₹5,499): Lists paperback on all 13 Amazon marketplaces, Barnes & Noble, and Ingram (30,000+ stores/libraries). The ₹8,899 bundle adds Emily Dickinson Award + Copyright Registration."},
  {topic:"copyright_reg",keywords:["copyright registration","register copyright","ip protection"],answer:"Included in the ₹8,899 bundle and Bestseller Breakthrough Package. BookLeaf files via the Indian Copyright Office on your behalf. Government review takes 6–9 months, but legal protection starts from filing date."},
  {topic:"login_credentials",keywords:["login details","didn't receive","credentials","no email","login not received"],answer:"Credentials are emailed within 2 minutes of payment. Check Spam/Junk folder. If missing, raise a ticket: https://bookleafpublishing.freshdesk.com/support/tickets/new"},
  {topic:"forgot_password",keywords:["forgot password","reset password","can't login","cannot login"],answer:"Visit https://dashboard.bookleafpub.in → 'Forgot Password' → enter registered email → use the reset code. Issues? Raise a ticket: https://bookleafpublishing.freshdesk.com/support/tickets/new"},
  {topic:"submit_poems",keywords:["submit poems","how to submit","upload poems","minimum poems","add poems"],answer:"Minimum 18 poems required (no upper limit). Go to Dashboard → Book Interior → 'Add' each poem → 'Save as Draft' after each. Text only — image uploads not supported. Submit all at once or over multiple days."},
  {topic:"save_progress",keywords:["save","auto save","progress","lost work","save draft"],answer:"The platform does NOT auto-save. Always click 'Save as Draft' after each poem entry to avoid losing work."},
  {topic:"rearrange",keywords:["rearrange","reorder","order poems","sequence","arrange"],answer:"Drag-and-drop is NOT supported. To reorder poems, delete all entries and re-upload in your desired sequence. Plan the order before starting."},
  {topic:"cover_design",keywords:["cover design","cover creator","front cover","template","background"],answer:"Dashboard → Cover Design → Background → Front. Browse templates or upload a custom design (exactly 5×8 inches). Use a PC/laptop — mobile browsers not supported for cover design."},
  {topic:"upload_cover",keywords:["upload cover","custom cover","own cover","my own design","5x8"],answer:"Go to Cover Design → Background → Front → 'Click to upload an image'. Must be exactly 5×8 inches. You can use your own fonts, colors, and layout."},
  {topic:"back_cover",keywords:["back cover","author bio","about author","back page","60 words"],answer:"Cover Design → Text → Back. Add 'About the Book' and 'About the Author' (60 words each max). Custom back cover image not supported — only solid color backgrounds with text."},
  {topic:"profile_photo",keywords:["profile photo","author photo","author image","picture"],answer:"In Back Cover section → 'Add Author Image' → upload your photo. Once uploaded, it can only be replaced, not removed. No image = no placeholder in print."},
  {topic:"publishing_timeline",keywords:["how long","publishing timeline","30 days","45 days","in review","when published"],answer:"Standard: 30–45 business days after final submission. Bestseller Breakthrough Package: 18–22 business days. Status shows 'In Review' until complete. You'll receive an email + dashboard update when published."},
  {topic:"distribution",keywords:["where available","platforms","online stores","offline","bookstores","physical stores"],answer:"Default: Paperback + eBook on BookLeaf's online store only. With Global Distribution/Bestseller Package: All 13 Amazon markets, Barnes & Noble, Ingram. NOT available in physical retail stores."},
  {topic:"ebook",keywords:["ebook","e-book","kindle","kdp","digital book"],answer:"Your eBook is exclusively on BookLeaf's bookstore — NOT on Amazon Kindle or other platforms. KDP dual-listing using BookLeaf's ISBN is not permitted."},
  {topic:"book_quality",keywords:["book quality","paper quality","gsm","print quality","cover quality"],answer:"Cover: 230 GSM premium material. Interior: 75 GSM high-quality paper. Lightweight, professionally finished."},
  {topic:"royalty_rate",keywords:["royalty rate","80%","80 percent","how much earn","earn per copy"],answer:"You earn 80% of the profit (not 80% of the listed price). Example: Book at ₹150 → ~₹85 deductions → ₹65 profit → your royalty = ₹52. Calculator: https://www.bookleafpub.in/printing-cost-royalty-calculator"},
  {topic:"100_royalty",keywords:["100% royalty","100 percent royalty","full royalty","bestseller royalty"],answer:"Bestseller Breakthrough authors get 100% of profit. Example: Book at ₹150 → ₹60 deductions → you get ₹90. Calculator: https://www.bookleafpub.in/printing-cost-royalty-calculator"},
  {topic:"sales_report",keywords:["sales report","check sales","view sales","isbn report"],answer:"Check sales at: https://ebooks.bookleafpub.com/sales-reports — enter your ISBN. Updates monthly after the 15th. First report available 45–60 business days after going live."},
  {topic:"royalty_payment",keywords:["royalty payment","when paid","threshold","minimum","claim royalty","payout"],answer:"Minimum: ₹2,000 (India) / $100 (international). Once crossed, inform BookLeaf via helpdesk → they send a Razorpay payout link → enter UPI/bank details. Bestseller Breakthrough authors: request payout anytime after 30 business days of going live."},
  {topic:"author_copy_coupon",keywords:["author copy","free copy","coupon code","my book copy","get my copy"],answer:"After publication, submit a review (link in your publication email) → coupon code emailed within 10 business days → use it on BookLeaf's store for your free paperback. Bestseller Breakthrough: 5 copies shipped directly. International authors: not eligible for free copy."},
  {topic:"bulk_order",keywords:["bulk order","more copies","extra copies","order more books"],answer:"Fill the bulk order form: https://docs.google.com/forms/d/e/1FAIpQLSeosYqrgnuZIWjbxikzijjk3-3AvRmlEFQgL821vi8sUbTXBw/viewform — BookLeaf sends a custom payment link. Delivery in 30–45 business days."},
  {topic:"amazon_out_of_stock",keywords:["out of stock","unavailable amazon","not showing amazon","amazon issue"],answer:"'Out of Stock' on Amazon is a common sync delay — usually resolves in 24–48 hours. If it persists beyond 48 hours, raise a support ticket."},
  {topic:"publishing_certificate",keywords:["certificate","publishing certificate"],answer:"Request your certificate at: https://docs.google.com/forms/d/e/1FAIpQLSc2q8Npy9bO3zpDuQKiupQP3ALNp_oYDjiEW7I46iSAF9Z64Q/viewform"},
  {topic:"post_publishing",keywords:["post publishing","edit after publish","change after published","2150"],answer:"Post-Publishing Changes (₹2,150 India / $30 international): Changes begin within 4–5 business days. You'll get draft access, then BookLeaf re-publishes with your updates."},
  {topic:"copyright_ownership",keywords:["copyright","rights","ownership","who owns","protect poems","confidential"],answer:"You retain 100% copyright. BookLeaf has only non-exclusive distribution rights. All staff sign confidentiality agreements. Your poems are never shared or reused without written consent."},
  {topic:"consultant",keywords:["publishing consultant","personal manager","consultant","not responding","no response"],answer:"With Bestseller Breakthrough Package, a Publishing Consultant contacts you within 5–7 business days of final submission. Not heard after 7 days? Raise a support ticket. Unresponsive consultant? Escalate via support — guaranteed response within 48 hours."},
  {topic:"dashboard_issue",keywords:["dashboard not working","not loading","portal issue","technical issue","broken","error dashboard"],answer:"Try: 1) Clear browser cache, 2) Use Chrome or Firefox on PC/laptop (not mobile), 3) If persists, raise a ticket at https://bookleafpublishing.freshdesk.com/support/tickets/new with a screenshot."},
];

function searchKnowledgeBase(query) {
  const lower = query.toLowerCase();
  let best = null, bestScore = 0;
  for (const item of KNOWLEDGE_BASE) {
    const score = item.keywords.filter(k => lower.includes(k)).length;
    if (score > bestScore) { bestScore = score; best = item; }
  }
  return bestScore > 0 ? { item: best, confidence: Math.min(0.6 + bestScore * 0.15, 0.95) } : null;
}

// ─── Mock Supabase DB ─────────────────────────────────────────────────────────
// In production: replace with actual Supabase client queries
const MOCK_DB = [
  {
    id: "auth_001",
    email: "priya.sharma@gmail.com",
    name: "Priya Sharma",
    book_title: "Echoes of Dawn",
    isbn: "978-93-5698-112-4",
    final_submission_date: "2024-11-10",
    book_live_date: "2025-01-20",
    royalty_status: "Paid",
    royalty_amount: "₹4,200",
    royalty_period: "Q4 2024",
    add_on_services: ["Bestseller Package", "PR Campaign"],
    author_copy_status: "Dispatched on 2025-01-25",
    publishing_stage: "Live",
  },
  {
    id: "auth_002",
    email: "rahul.verma@outlook.com",
    name: "Rahul Verma",
    book_title: "The Last Monsoon",
    isbn: "978-93-5698-113-1",
    final_submission_date: "2025-01-05",
    book_live_date: "2025-03-01",
    royalty_status: "Pending",
    royalty_amount: null,
    royalty_period: "Q1 2025 — Report Due",
    add_on_services: ["Award Submission"],
    author_copy_status: "Not yet dispatched",
    publishing_stage: "Live",
  },
  {
    id: "auth_003",
    email: "ananya.k@yahoo.com",
    name: "Ananya K.",
    book_title: "Between Two Rivers",
    isbn: "978-93-5698-114-8",
    final_submission_date: "2024-12-20",
    book_live_date: "Processing",
    royalty_status: "Not Generated",
    royalty_amount: null,
    royalty_period: null,
    add_on_services: [],
    author_copy_status: "Will be dispatched after go-live",
    publishing_stage: "In Progress",
  },
  {
    id: "auth_004",
    email: "deepak.nair@gmail.com",
    name: "Deepak Nair",
    book_title: "Shadows & Silence",
    isbn: "978-93-5698-115-5",
    final_submission_date: "2025-02-14",
    book_live_date: "2025-04-30",
    royalty_status: "Paid",
    royalty_amount: "₹2,800",
    royalty_period: "Q1 2025",
    add_on_services: ["Bestseller Package"],
    author_copy_status: "Dispatched on 2025-05-03",
    publishing_stage: "Live",
  },
  {
    id: "auth_005",
    email: "sara.johnson@xyz.com",
    name: "Sara Johnson",
    book_title: "Petals in the Wind",
    isbn: "978-93-5698-116-2",
    final_submission_date: "2025-03-01",
    book_live_date: "Processing",
    royalty_status: "Under Review",
    royalty_amount: null,
    royalty_period: null,
    add_on_services: ["PR Campaign", "Award Submission"],
    author_copy_status: "Not yet dispatched",
    publishing_stage: "In Progress",
  },
];

// ─── Query Log (in-memory; swap for DB write in production) ──────────────────
const QUERY_LOG = [];

function logQuery(entry) {
  QUERY_LOG.push({ ...entry, timestamp: new Date().toISOString() });
  // In production: INSERT into Supabase query_logs table
}

// ─── Intent & Entity Classifier ──────────────────────────────────────────────
const INTENT_PATTERNS = {
  book_live: ["live", "published", "available", "launch", "amazon", "book out", "go live"],
  royalty: ["royalt", "payment", "paid", "earnings", "money", "income", "revenue", "report"],
  isbn: ["isbn", "barcode", "book number"],
  addon: ["bestseller", "pr campaign", "award", "add-on", "addon", "package"],
  author_copy: ["copy", "copies", "physical", "dispatch", "shipping", "courier", "delivered"],
  submission: ["submitted", "submission", "final", "upload", "manuscript", "timeline"],
  dashboard: ["dashboard", "login", "access", "portal", "password", "account"],
  book_sales: ["sales", "sold", "units", "copies sold", "performance"],
};

function classifyIntent(query) {
  const lower = query.toLowerCase();
  let bestIntent = "general";
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_PATTERNS)) {
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Confidence: 0 matches → 0.4, 1 match → ~0.7, 2+ → 0.9+
  const confidence = bestScore === 0 ? 0.4 : Math.min(0.5 + bestScore * 0.2, 0.97);
  return { intent: bestIntent, confidence };
}

// ─── User Matcher ─────────────────────────────────────────────────────────────
function findAuthor(query, emailHint) {
  if (emailHint) {
    const found = MOCK_DB.find((u) => u.email.toLowerCase() === emailHint.toLowerCase());
    if (found) return { author: found, matchType: "email_exact" };
  }

  const lower = query.toLowerCase();

  // Try email in query
  const emailMatch = MOCK_DB.find((u) => lower.includes(u.email.toLowerCase()));
  if (emailMatch) return { author: emailMatch, matchType: "email_in_query" };

  // Try book title keywords
  const titleMatch = MOCK_DB.find((u) =>
    u.book_title
      .toLowerCase()
      .split(" ")
      .some((word) => word.length > 3 && lower.includes(word))
  );
  if (titleMatch) return { author: titleMatch, matchType: "title_keyword" };

  // Fallback: no match
  return { author: null, matchType: "no_match" };
}

// ─── Response Builder ─────────────────────────────────────────────────────────
function buildResponse(intent, author) {
  if (!author) {
    return `I couldn't find your account in our system. Please provide your registered email address so I can look up your details. You can also reach us at support@bookleafpub.com.`;
  }

  const r = author;
  switch (intent) {
    case "book_live":
      return r.book_live_date === "Processing"
        ? `Your book **"${r.book_title}"** is currently being processed. We're working on it! Expected timeline is typically 6–8 weeks from submission (submitted: ${r.final_submission_date}). We'll notify you by email once it's live.`
        : `Great news! Your book **"${r.book_title}"** went live on **${r.book_live_date}**. 🎉 It should be available on Amazon, Flipkart, and other platforms. ISBN: ${r.isbn}`;

    case "royalty":
      if (r.royalty_status === "Paid")
        return `Your royalty for **"${r.book_title}"** has been paid.\n\n💰 Amount: **${r.royalty_amount}**\n📅 Period: ${r.royalty_period}\n\nFor a detailed breakdown, visit your author dashboard at dashboard.bookleafpub.com`;
      if (r.royalty_status === "Pending")
        return `Your royalty report for **"${r.book_title}"** is currently **pending**.\n\n📋 Period: ${r.royalty_period}\n\nRoyalty reports are generated quarterly. You'll receive an email once the report is ready. Usually processed within the first 2 weeks of each quarter.`;
      return `Royalty for **"${r.book_title}"** has not been generated yet — the book is still in the publishing pipeline. Royalties begin accruing once your book goes live.`;

    case "isbn":
      return `Your ISBN for **"${r.book_title}"** is:\n\n📖 **${r.isbn}**\n\nThis ISBN is registered internationally and is used on all retail platforms including Amazon, Google Books, and Flipkart.`;

    case "addon":
      if (r.add_on_services.length === 0)
        return `No add-on services are currently active for **"${r.book_title}"**.\n\nWe offer Bestseller Package, PR Campaigns, and Award Submissions. Contact info@bookleafpub.com to know more!`;
      return `Active add-on services for **"${r.book_title}"**:\n\n${r.add_on_services.map((s) => `✅ ${s}`).join("\n")}\n\nFor status updates on specific services, email addons@bookleafpub.com`;

    case "author_copy":
      return `Author copy status for **"${r.book_title}"**:\n\n📦 ${r.author_copy_status}\n\nFor any dispatch issues or tracking, email dispatch@bookleafpub.com with your order ID.`;

    case "submission":
      return `Publishing timeline for **"${r.book_title}"**:\n\n📝 Submitted: **${r.final_submission_date}**\n📅 Live Date: **${r.book_live_date}**\n🔖 Stage: ${r.publishing_stage}`;

    case "dashboard":
      return `To access your author dashboard:\n\n🔗 Visit **dashboard.bookleafpub.com**\n📧 Login with: ${r.email}\n\nIf you've forgotten your password, use the "Forgot Password" option or email support@bookleafpub.com`;

    case "book_sales":
      return `Book sales data for **"${r.book_title}"** is available in your author dashboard under the "Sales" section.\n\n🔗 dashboard.bookleafpub.com → My Books → ${r.book_title} → Sales Report\n\nFor detailed quarterly reports, email royalties@bookleafpub.com`;

    default:
      return `Here's a summary for **"${r.book_title}"** (${r.email}):\n\n📅 Submitted: ${r.final_submission_date}\n📗 Live Date: ${r.book_live_date}\n💰 Royalty: ${r.royalty_status}\n📖 ISBN: ${r.isbn}\n\nWhat specific information do you need?`;
  }
}

// ─── AI-Enhanced Response (OpenAI fallback / enhancement) ────────────────────
async function getAIResponse(query, authorData, intent, confidence) {
  try {
    const systemPrompt = `You are a helpful customer support assistant for BookLeaf Publishing. 
You have access to the following author data: ${JSON.stringify(authorData, null, 2)}
The detected intent is: ${intent} (confidence: ${Math.round(confidence * 100)}%)

Guidelines:
- Be warm, professional, and concise
- Use the author's actual data from the database
- If data is missing or unclear, escalate politely
- Always refer to the book by its title
- Keep responses under 150 words
- Use markdown for formatting (bold for key values)`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    // Graceful fallback if OpenAI is down or key is missing
    console.warn("OpenAI unavailable, using rule-based response:", err.message);
    return null;
  }
}

// ─── POST /api/query ──────────────────────────────────────────────────────────
app.post("/api/query", async (req, res) => {
  const { query, email, useAI = true } = req.body;

  if (!query || query.trim().length === 0) {
    return res.status(400).json({ error: "Query cannot be empty" });
  }

  try {
    // 1. Classify intent
    const { intent, confidence } = classifyIntent(query);

    // 2. Find author
    const { author, matchType } = findAuthor(query, email);

    // 3. Escalation check
    const shouldEscalate = confidence < 0.8 || matchType === "no_match";

    let responseText;
    let escalated = false;

    // Check knowledge base for general questions (no author needed)
    const kbResult = searchKnowledgeBase(query);
    const isGeneralQuery = ["dashboard","general","book_sales"].includes(intent) || matchType === "no_match";

    if (matchType === "no_match" && kbResult) {
      // Answer from KB — no author record needed
      responseText = kbResult.item.answer;
      confidence = kbResult.confidence;
      escalated = false;
    } else if (shouldEscalate && matchType === "no_match") {
      // Check KB one more time before escalating
      responseText = kbResult
        ? kbResult.item.answer
        : "I couldn't find your account. Please share your registered email so I can look up your details. Alternatively, our team at support@bookleafpub.com can assist you.";
      escalated = !kbResult;
    } else if (shouldEscalate && confidence < 0.8) {
      // Low confidence → escalate
      responseText = `I'm not fully confident I understood your query (confidence: ${Math.round(confidence * 100)}%). I've escalated this to our support team who will respond within 24 hours. You can also reach us directly at support@bookleafpub.com.`;
      escalated = true;
    } else {
      // Try AI-enhanced response first
      if (useAI && process.env.OPENAI_API_KEY) {
        const aiResp = await getAIResponse(query, author, intent, confidence);
        responseText = aiResp || buildResponse(intent, author);
      } else {
        responseText = buildResponse(intent, author);
      }
    }

    // 4. Log the query
    logQuery({
      query,
      intent,
      confidence,
      escalated,
      authorId: author?.id || null,
      matchType,
    });

    // 5. Return response
    return res.json({
      response: responseText,
      intent,
      confidence: Math.round(confidence * 100),
      escalated,
      authorFound: !!author,
      authorName: author?.name || null,
      bookTitle: author?.book_title || null,
    });
  } catch (err) {
    console.error("Query handling error:", err);
    // Error fallback
    logQuery({ query, error: err.message, escalated: true });
    return res.json({
      response:
        "I'm experiencing a technical issue right now. Please try again in a moment, or contact support@bookleafpub.com directly.",
      escalated: true,
      error: true,
    });
  }
});

// ─── GET /api/authors ─────────────────────────────────────────────────────────
app.get("/api/authors", (req, res) => {
  res.json(MOCK_DB.map(({ id, email, name, book_title, publishing_stage }) => ({ id, email, name, book_title, publishing_stage })));
});

// ─── GET /api/logs ────────────────────────────────────────────────────────────
app.get("/api/logs", (req, res) => {
  res.json(QUERY_LOG.slice().reverse());
});

// ─── GET /api/author/:email ───────────────────────────────────────────────────
app.get("/api/author/:email", (req, res) => {
  const author = MOCK_DB.find((u) => u.email.toLowerCase() === req.params.email.toLowerCase());
  if (!author) return res.status(404).json({ error: "Author not found" });
  res.json(author);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`BookLeaf Query Bot running on http://localhost:${PORT}`));
