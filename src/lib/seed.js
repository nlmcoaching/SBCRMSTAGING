import { emptyChecklist } from "./constants.js";
import { emptyEquipChecklist, emptySessionChecklist } from "./checklists.js";

export const SEED = {
  partners: [
    { id: "sp1", name: "YogaSix Walnut Creek", studioType: "Yoga", location: "Walnut Creek, CA", contact: "Alyssa Tran", role: "Manager", email: "alyssa@example.com", phone: "555-0201", stage: "Recurring partner", estimatedCommunitySize: 320, bestFitJourney: "Reset & Release", revenuePotential: 2400, closeProbability: "Closed Won", revShare: "70/30 split (us/studio)", studioSharePct: 30, contractStatus: "Signed", outreachDate: "2026-03-01", lastTouch: "2026-06-11", nextAction: "2026-06-18", avgAttendance: 14, sessionsPerMonth: 4, insuranceReqs: "COI on file", promotionCommitments: "Monthly IG story + email to list", notes: "Thursday Reset is the anchor class; strong word of mouth. Alyssa is a champion.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: true, booking_page: true, qr_code: true, event_flyer: true, studio_email: true, social_posts: true, waiver_link: true, payment_flow: true, registration_checked: true, reminder_email: true, room_setup: true, equipment_packed: true, arrival_confirmed: true, revenue_reconciled: true, studio_paid: true, followup_sent: true, testimonials_requested: true, next_date: true } },
    { id: "sp2", name: "CorePower Lafayette", studioType: "Yoga", location: "Lafayette, CA", contact: "Mike Donnelly", role: "Owner", email: "mike@example.com", phone: "555-0202", stage: "Demo completed", estimatedCommunitySize: 280, bestFitJourney: "Letting Go & Rebirth", revenuePotential: 1800, closeProbability: "High", revShare: "Flat room fee $75", studioSharePct: 0, contractStatus: "None", outreachDate: "2026-05-10", lastTouch: "2026-06-03", nextAction: "2026-06-16", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "Needs COI before pilot", promotionCommitments: "TBD — discussing newsletter feature", notes: "Demo went well 6/3. Mike is interested but cautious. Follow up with pilot proposal this week.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: false, decision_maker: true, agreement_uploaded: false, booking_page: false, qr_code: false, event_flyer: false, studio_email: false, social_posts: false, waiver_link: false, payment_flow: false, registration_checked: false, reminder_email: false, room_setup: false, equipment_packed: false, arrival_confirmed: false, revenue_reconciled: false, studio_paid: false, followup_sent: false, testimonials_requested: false, next_date: false } },
    { id: "sp3", name: "The Still Point", studioType: "Meditation", location: "Pleasant Hill, CA", contact: "Renee Park", role: "Director", email: "renee@example.com", phone: "555-0203", stage: "Pilot proposed", estimatedCommunitySize: 140, bestFitJourney: "Nervous System Reset", revenuePotential: 1200, closeProbability: "Medium", revShare: "80/20 split (us/studio)", studioSharePct: 20, contractStatus: "Drafted", outreachDate: "2026-04-15", lastTouch: "2026-06-05", nextAction: "2026-06-14", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "COI + liability waiver required", promotionCommitments: "4-week pilot feature on their blog", notes: "4-week Sunday evening pilot proposed. Contract drafted but not returned. Renee responsive over email.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: false, booking_page: false, qr_code: false, event_flyer: false, studio_email: false, social_posts: false, waiver_link: false, payment_flow: false, registration_checked: false, reminder_email: false, room_setup: false, equipment_packed: false, arrival_confirmed: false, revenue_reconciled: false, studio_paid: false, followup_sent: false, testimonials_requested: false, next_date: false } },
    { id: "sp4", name: "Flow State Studio", studioType: "Wellness", location: "Concord, CA", contact: "Tara Iverson", role: "Owner", email: "tara@example.com", phone: "555-0204", stage: "Initial outreach sent", estimatedCommunitySize: 90, bestFitJourney: "Breathwork Basics", revenuePotential: 900, closeProbability: "Low", revShare: "TBD", studioSharePct: 0, contractStatus: "None", outreachDate: "2026-06-09", lastTouch: "2026-06-09", nextAction: "2026-06-17", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "Warm intro from Dana. Sent intro email 6/9. Waiting on reply.", checklist: emptyChecklist() },
    { id: "sp5", name: "Lotus & Pine", studioType: "Yoga", location: "Danville, CA", contact: "Geoff Adams", role: "Manager", email: "geoff@example.com", phone: "555-0205", stage: "Recurring partner", estimatedCommunitySize: 500, bestFitJourney: "Deep Surrender", revenuePotential: 5200, closeProbability: "Closed Won", revShare: "60/40 split (us/studio)", studioSharePct: 40, contractStatus: "Signed", outreachDate: "2026-01-15", lastTouch: "2026-06-10", nextAction: "2026-06-20", avgAttendance: 18, sessionsPerMonth: 8, insuranceReqs: "COI on file + annual renewal", promotionCommitments: "Co-branded social posts + monthly email feature", notes: "Two weekly slots plus monthly workshop. Best earner. Geoff wants to add a Friday morning slot.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: true, booking_page: true, qr_code: true, event_flyer: true, studio_email: true, social_posts: true, waiver_link: true, payment_flow: true, registration_checked: true, reminder_email: true, room_setup: true, equipment_packed: true, arrival_confirmed: true, revenue_reconciled: true, studio_paid: true, followup_sent: true, testimonials_requested: true, next_date: true } },
  ],
  clients: [
    { id: "c1", name: "Jordan Lee",   phone: "555-0101", email: "jordan@example.com", source: "Studio partner",  status: "Lead",          clientType: "High-value lead",          tags: ["Anxiety","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-12", packageType: "None",       lifetimeValue: 0,   notes: "Found us via YogaSix flyer; anxious about first session, wants calm intro",      referral: "Low"    },
    { id: "c2", name: "Maya Chen",    phone: "555-0102", email: "maya@example.com",   source: "Instagram",       status: "Booked",        clientType: "First-time attendee",      tags: ["Burnout","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-14", packageType: "None",       lifetimeValue: 0,   notes: "DM'd after breathwork reel; dealing with work burnout",                         referral: "Medium" },
    { id: "c3", name: "Chris Okafor", phone: "555-0103", email: "chris@example.com",  source: "Referral",        status: "Attended 1x",   clientType: "Repeat attendee",          tags: ["Letting go","Transformation seeker"],                   firstSession: "2026-06-01", sessionsAttended: 1,  lastSession: "2026-06-01", nextSession: "2026-06-15", packageType: "Drop-in",    lifetimeValue: 35,  notes: "Big emotional release in first session; referred by Maya",                      referral: "High"   },
    { id: "c4", name: "Priya Nair",   phone: "555-0104", email: "priya@example.com",  source: "Post-session",    status: "Engaged (2-3x)", clientType: "Repeat attendee",         tags: ["Nervous system reset","Stress relief"],                 firstSession: "2026-05-10", sessionsAttended: 3,  lastSession: "2026-06-07", nextSession: "2026-06-13", packageType: "3-pack",     lifetimeValue: 105, notes: "Sleep issues improving; mentioned wanting partner to join",                     referral: "Medium" },
    { id: "c5", name: "Sam Rivera",   phone: "555-0105", email: "sam@example.com",    source: "Studio partner",  status: "Member (4+)",   clientType: "Member",                   tags: ["Grief","Letting go","Transformation seeker"],            firstSession: "2026-04-02", sessionsAttended: 9,  lastSession: "2026-06-09", nextSession: "2026-06-16", packageType: "Membership", lifetimeValue: 540, notes: "Core regular; grief processing journey, very committed",                        referral: "High"   },
    { id: "c6", name: "Dana Wolfe",   phone: "555-0106", email: "dana@example.com",   source: "Referral",        status: "Advocate",      clientType: "Advocate",                 tags: ["Spiritual growth","Transformation seeker"],             firstSession: "2026-03-15", sessionsAttended: 12, lastSession: "2026-06-10", nextSession: "2026-06-17", packageType: "5-pack",     lifetimeValue: 610, notes: "Has referred 3 friends; natural community builder",                            referral: "High"   },
  ],
  sessions: [
    { id: "se1", name: "YogaSix Thursday Reset 6/4", studioId: "sp1", date: "2026-06-04", time: "7:00 PM", status: "Closed out", journey: "Reset & Release", capacity: 18, registered: 15, attendance: 13, paidAttendees: 13, waivers: 12, noShows: 2, pricePerSeat: 35, revenue: 455, studioSplit: 136.5, netRevenue: 318.5, conversion: 0.31, packagesSold: 2, referralsGenerated: 1, equipmentNeeded: "Headset, portable speaker, lavender oil", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 1, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Sound bath close landed well; 2 three-packs sold at door", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
    { id: "se2", name: "YogaSix Thursday Reset 6/11", studioId: "sp1", date: "2026-06-11", time: "7:00 PM", status: "Follow-up pending", journey: "Reset & Release", capacity: 18, registered: 18, attendance: 16, paidAttendees: 16, waivers: 15, noShows: 2, pricePerSeat: 35, revenue: 560, studioSplit: 168, netRevenue: 392, conversion: 0.38, packagesSold: 3, referralsGenerated: 2, equipmentNeeded: "Headset, portable speaker, eye masks", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 2, followUpSent: false, rebookOfferSent: false, referralsRequested: false, notes: "Best turnout yet; Priya brought a friend. Room hit capacity — talk to Alyssa about expanding.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: false, testimonials_done: true, followup_sent: false, rebook_offered: false, referrals_asked: false, notes_written: false } },
    { id: "se3", name: "Lotus & Pine Sunday Slow Down 6/7", studioId: "sp5", date: "2026-06-07", time: "5:00 PM", status: "Closed out", journey: "Deep Surrender", capacity: 24, registered: 21, attendance: 19, paidAttendees: 19, waivers: 18, noShows: 2, pricePerSeat: 35, revenue: 665, studioSplit: 266, netRevenue: 399, conversion: 0.26, packagesSold: 2, referralsGenerated: 0, equipmentNeeded: "Headset, speaker, singing bowl, blankets", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 0, followUpSent: true, rebookOfferSent: true, referralsRequested: false, notes: "Room near capacity; pitch membership earlier next time. No testimonials captured — add request at end.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: false, followup_sent: true, rebook_offered: true, referrals_asked: false, notes_written: true } },
    { id: "se4", name: "Lotus & Pine New Moon Workshop 6/9", studioId: "sp5", date: "2026-06-09", time: "7:30 PM", status: "Closed out", journey: "New Moon Ceremony", capacity: 30, registered: 25, attendance: 22, paidAttendees: 20, waivers: 20, noShows: 3, pricePerSeat: 50, revenue: 1100, studioSplit: 440, netRevenue: 660, conversion: 0.18, packagesSold: 1, referralsGenerated: 3, equipmentNeeded: "Headset, speaker, candles, intention cards, journal prompts", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 3, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Workshop format converts slower but generates referrals. 2 unpaid attendees — tighten payment flow.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
  ],
  offers: [
    { id: "o1",  name: "Chris / 3-pack",                  clientId: "c3", offerType: "3-pack",                    price: 105, status: "Sent",           dateOffered: "2026-06-01", expireDate: "2026-06-15", followUpDate: "2026-06-08",  probability: "60%", source: "Post-session",    notes: "Said he'd think about it",         reasonLost: "" },
    { id: "o2",  name: "Priya / 3-pack",                  clientId: "c4", offerType: "3-pack",                    price: 105, status: "Paid",           dateOffered: "2026-05-10", expireDate: "",           followUpDate: "",           probability: "100%",source: "Post-session",    notes: "",                                 reasonLost: "" },
    { id: "o3",  name: "Sam / 6-pack",                    clientId: "c5", offerType: "6-pack",                    price: 195, status: "Accepted",       dateOffered: "2026-04-20", expireDate: "",           followUpDate: "",           probability: "90%", source: "Referral",        notes: "Loved the first session",          reasonLost: "" },
    { id: "o4",  name: "Maya / Single session",           clientId: "c2", offerType: "Single session",            price: 35,  status: "Follow-up due",  dateOffered: "2026-06-10", expireDate: "2026-06-20", followUpDate: "2026-06-13", probability: "50%", source: "Instagram",       notes: "Interested, needs nudge",          reasonLost: "" },
    { id: "o5",  name: "Dana / 6-pack",                   clientId: "c6", offerType: "6-pack",                    price: 195, status: "Paid",           dateOffered: "2026-05-28", expireDate: "",           followUpDate: "",           probability: "100%",source: "Studio partner",  notes: "",                                 reasonLost: "" },
    { id: "o6",  name: "Jordan / Single session",         clientId: "c1", offerType: "Single session",            price: 35,  status: "Declined",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "0%",  source: "Direct outreach", notes: "",                                 reasonLost: "Not the right time" },
    { id: "o7",  name: "CorePower Berkeley / Studio pilot",clientId: "",  offerType: "Studio pilot",              price: 300, status: "Sent",           dateOffered: "2026-06-09", expireDate: "2026-06-23", followUpDate: "2026-06-14", probability: "70%", source: "Direct outreach", notes: "Very interested, follow up Friday", reasonLost: "" },
    { id: "o8",  name: "Lotus & Pine / Recurring",        clientId: "",   offerType: "Studio recurring agreement",price: 600, status: "Accepted",       dateOffered: "2026-05-15", expireDate: "",           followUpDate: "",           probability: "100%",source: "Referral",        notes: "Signed May 20",                    reasonLost: "" },
    { id: "o9",  name: "Maya / 3-pack",                   clientId: "c2", offerType: "3-pack",                    price: 105, status: "Viewed",         dateOffered: "2026-06-12", expireDate: "2026-06-26", followUpDate: "2026-06-14", probability: "65%", source: "Post-session",    notes: "Opened the email twice",           reasonLost: "" },
    { id: "o10", name: "Corporate wellness / Group event", clientId: "",  offerType: "Group event",               price: 450, status: "Drafted",        dateOffered: "2026-06-13", expireDate: "2026-06-27", followUpDate: "2026-06-16", probability: "40%", source: "LinkedIn",        notes: "HR lead, warm intro via Sam",      reasonLost: "" },
    { id: "o11", name: "Past lead / 3-pack",              clientId: "",   offerType: "3-pack",                    price: 105, status: "Expired",        dateOffered: "2026-05-01", expireDate: "2026-05-15", followUpDate: "",           probability: "0%",  source: "Instagram",       notes: "",                                 reasonLost: "No response" },
    { id: "o12", name: "Priya / Private session",         clientId: "c4", offerType: "Private session",           price: 150, status: "Accepted",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "90%", source: "Post-session",    notes: "Requested after group session",    reasonLost: "" },
  ],
  revenue: [],
  content: [
    { id: "ct1",  name: "Maya's burnout-to-calm transformation",           category: "Client transformation",      status: "Published", platform: "Instagram", scheduledDate: "2026-06-02", datePosted: "2026-06-02", body: "3 months ago Maya could barely slow down. Last night she stayed in savasana for 10 minutes. That's the work. ✨ #breathwork #transformation", cta: "DM me", sessionId: "s1", partnerId: "", reused: false, reach: 1840, likes: 312, comments: 28, shares: 18, saves: 41, engagement: 420, leads: 3, booked: 1, revenue: 35,  notes: "Best organic reach in June" },
    { id: "ct2",  name: "What is box breathing (60s explainer)",            category: "Breathwork education",       status: "Published", platform: "TikTok",    scheduledDate: "2026-06-05", datePosted: "2026-06-05", body: "4 seconds in. Hold 4. Out 4. Hold 4. Your nervous system NEEDS this. Try it right now.", cta: "Save this", sessionId: "", partnerId: "", reused: false, reach: 8400, likes: 920, comments: 62, shares: 310, saves: 205, engagement: 1850, leads: 5, booked: 2, revenue: 70,  notes: "Went semi-viral. Repurpose to IG Reel" },
    { id: "ct3",  name: "June Thursday Reset invite (YogaSix)",              category: "Studio partner promotion",   status: "Published", platform: "Instagram", scheduledDate: "2026-06-08", datePosted: "2026-06-08", body: "Join us this Thursday at YogaSix Walnut Creek 🌿 45 min breathwork journey. Limited spots.", cta: "Link in bio", sessionId: "s2", partnerId: "sp1", reused: false, reach: 920, likes: 88, comments: 14, shares: 6, saves: 12, engagement: 210, leads: 4, booked: 3, revenue: 105, notes: "" },
    { id: "ct4",  name: "Sam Rivera testimonial clip",                       category: "Testimonials",               status: "Published", platform: "Instagram", scheduledDate: "2026-06-09", datePosted: "2026-06-09", body: "\"I didn't know I was holding so much until it started to move.\" — Sam Rivera after her first session 🙏", cta: "Book a session", sessionId: "s1", partnerId: "", reused: false, reach: 1620, likes: 242, comments: 36, shares: 24, saves: 58, engagement: 380, leads: 2, booked: 1, revenue: 35,  notes: "High save rate — strong social proof" },
    { id: "ct5",  name: "Monthly newsletter: breath + sleep connection",     category: "Breathwork education",       status: "Published", platform: "Email",     scheduledDate: "2026-06-10", datePosted: "2026-06-10", body: "How breathwork activates the parasympathetic nervous system and why that changes sleep quality...", cta: "Book a session", sessionId: "", partnerId: "", reused: false, reach: 340, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 95, leads: 1, booked: 1, revenue: 35,  notes: "Open rate 42%. Strong CTA click" },
    { id: "ct6",  name: "Why I started Simply Breathe (founder story)",      category: "Founder story",              status: "Published", platform: "Instagram", scheduledDate: "2026-06-11", datePosted: "2026-06-11", body: "The moment I realized I hadn't taken a full breath in 3 years was the moment everything changed. Here's why I do this work...", cta: "Comment below", sessionId: "", partnerId: "", reused: false, reach: 2100, likes: 418, comments: 52, shares: 30, saves: 22, engagement: 540, leads: 6, booked: 2, revenue: 70,  notes: "Highest engagement this month" },
    { id: "ct7",  name: "3 signs your nervous system needs a reset",         category: "Nervous system regulation",  status: "Published", platform: "TikTok",    scheduledDate: "2026-06-12", datePosted: "2026-06-12", body: "1. You wake up already exhausted. 2. You hold your breath when stressed. 3. You can't turn your mind off...", cta: "Save this", sessionId: "", partnerId: "", reused: false, reach: 5200, likes: 610, comments: 48, shares: 190, saves: 310, engagement: 1200, leads: 4, booked: 1, revenue: 35,  notes: "Repurpose to IG carousel" },
    { id: "ct8",  name: "Behind the scenes: how I set up a breathwork room",  category: "Behind the scenes",          status: "Draft",     platform: "Instagram", scheduledDate: "2026-06-18", datePosted: "", body: "The mats, the diffuser, the lighting — here's everything I bring to make the space feel safe...", cta: "Comment below", sessionId: "", partnerId: "sp1", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Film this Thursday before session" },
    { id: "ct9",  name: "Is breathwork safe during pregnancy? (FAQ)",        category: "FAQs",                       status: "Scheduled", platform: "Instagram", scheduledDate: "2026-06-20", datePosted: "", body: "Short answer: modified practice, yes. Here's what to know before booking...", cta: "DM me", sessionId: "", partnerId: "", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Evergreen content — schedule in advance" },
    { id: "ct10", name: "Upcoming Lotus & Pine New Moon session",             category: "Upcoming sessions",          status: "Idea",      platform: "Instagram", scheduledDate: "2026-06-22", datePosted: "", body: "", cta: "Link in bio", sessionId: "s3", partnerId: "sp5", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Coordinate with Geoff for co-post" },
  ],
  followups: [
    { id: "f1", name: "Chris 24h check-in", clientId: "c3", stage: "Attended 1x", lastContact: "2026-06-01", futype: "24h", nextAction: "2026-06-02", outcome: "Replied - booked next session" },
    { id: "f2", name: "Maya 72h nudge", clientId: "c2", stage: "Booked", lastContact: "2026-06-09", futype: "72h", nextAction: "2026-06-12", outcome: "" },
    { id: "f3", name: "Dana referral ask", clientId: "c6", stage: "Advocate", lastContact: "2026-06-10", futype: "Referral", nextAction: "2026-06-13", outcome: "" },
    { id: "f4", name: "Jordan reactivation", clientId: "c1", stage: "Lead", lastContact: "2026-06-05", futype: "Reactivation", nextAction: "2026-06-19", outcome: "" },
    { id: "f5", name: "Priya 72h post-session", clientId: "c4", stage: "Engaged (2-3x)", lastContact: "2026-06-07", futype: "72h", nextAction: "2026-06-10", outcome: "Confirmed Friday session" },
  ],
  referrals: [
    { id: "rf1", referrerId: "c6", referredName: "Chris Okafor",       referredId: "c3", date: "2026-05-25", status: "Attended",  revenue: 35,  thankYouSent: true,  rewardGiven: false, notes: "Dana mentioned breathwork at yoga class" },
    { id: "rf2", referrerId: "c3", referredName: "Maya Chen",           referredId: "c2", date: "2026-06-02", status: "Contacted", revenue: 0,   thankYouSent: true,  rewardGiven: false, notes: "Chris shared the IG post with Maya" },
    { id: "rf3", referrerId: "c6", referredName: "Sam Rivera",          referredId: "c5", date: "2026-04-01", status: "Purchased", revenue: 540, thankYouSent: true,  rewardGiven: true,  notes: "Long-time friend of Dana — signed up same week" },
    { id: "rf4", referrerId: "c5", referredName: "Priya Nair",          referredId: "c4", date: "2026-05-08", status: "Purchased", revenue: 105, thankYouSent: true,  rewardGiven: false, notes: "Sam mentioned it to Priya at work" },
    { id: "rf5", referrerId: "c6", referredName: "Alex Kim (new lead)", referredId: "",   date: "2026-06-11", status: "Referred",  revenue: 0,   thankYouSent: false, rewardGiven: false, notes: "Dana mentioned the June workshop" },
    { id: "rf6", referrerId: "c4", referredName: "Priya's partner",     referredId: "",   date: "2026-06-07", status: "Referred",  revenue: 0,   thankYouSent: false, rewardGiven: false, notes: "Mentioned wanting partner to join at Sunday session" },
  ],
  sequences: [
    {
      id: "sq1", clientId: "c5", sessionDate: "2026-06-09",
      sessionName: "Lotus & Pine New Moon 6/9", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-09", sent: true,  sentAt: "2026-06-09", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-12", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-23", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq2", clientId: "c6", sessionDate: "2026-06-10",
      sessionName: "YogaSix Thursday Reset 6/10", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-11", sent: true,  sentAt: "2026-06-11", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-16", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-24", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq3", clientId: "c4", sessionDate: "2026-06-07",
      sessionName: "Lotus & Pine Sunday Slow Down 6/7", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-08", sent: true,  sentAt: "2026-06-08", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-10", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-21", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq4", clientId: "c3", sessionDate: "2026-06-01",
      sessionName: "CorePower Berkeley Pilot 6/1", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-01", sent: true,  sentAt: "2026-06-01", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-02", sent: true,  sentAt: "2026-06-02", notes: "Replied — said they felt it" },
        { stepId: "h72",      dueDate: "2026-06-04", sent: true,  sentAt: "2026-06-04", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
      ],
    },
  ],
  outreach: [
    { id: "ot1", name: "Empower Flow Studio",  targetType: "Studio",  contactName: "Jess Moreno",   email: "jess@empower.com",  phone: "555-0301", location: "Oakland, CA",      source: "Instagram DM",  warmth: "Hot",  priority: "High",   status: "Demo scheduled",    responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-10", nextFollowUp: "2026-06-15", revenuePotential: 2200, partnerId: "", notes: "Jess replied within 2 hours. Very excited. 40 person community." },
    { id: "ot2", name: "Nourish Wellness",     targetType: "Studio",  contactName: "Andrea Solis",  email: "andrea@nourish.com",phone: "555-0302", location: "Berkeley, CA",     source: "Referral",      warmth: "Warm", priority: "High",   status: "Responded",         responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-08", nextFollowUp: "2026-06-13", revenuePotential: 1600, partnerId: "", notes: "Referred by Alyssa at YogaSix. Warm intro. Wants to see more info." },
    { id: "ot3", name: "Peak Performance Gym", targetType: "Gym",     contactName: "Derek Wallace", email: "derek@peak.com",     phone: "555-0303", location: "Danville, CA",    source: "Cold outreach", warmth: "Cold", priority: "Medium", status: "Messaged",          responseStatus: "No response", outreachMessage: "template_gym",   lastContact: "2026-06-05", nextFollowUp: "2026-06-14", revenuePotential: 1400, partnerId: "", notes: "Sent IG DM and email. No response after 8 days." },
    { id: "ot4", name: "Mindful Motion",       targetType: "Studio",  contactName: "Priya Sharma",  email: "priya@mindful.com", phone: "555-0304", location: "Walnut Creek, CA", source: "In person",     warmth: "Warm", priority: "Medium", status: "Agreement pending",  responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-11", nextFollowUp: "2026-06-16", revenuePotential: 1900, partnerId: "", notes: "Met at wellness fair. Agreement sent. Waiting on signature." },
    { id: "ot5", name: "Elevate Corporate",    targetType: "Corporate",contactName: "Tom Reyes",    email: "tom@elevate.com",   phone: "555-0305", location: "San Francisco, CA",source: "LinkedIn",      warmth: "Warm", priority: "High",   status: "Demo offered",      responseStatus: "Responded",   outreachMessage: "template_corp",  lastContact: "2026-06-09", nextFollowUp: "2026-06-17", revenuePotential: 3500, partnerId: "", notes: "Corporate wellness budget approved Q3. Offered lunch & learn demo." },
    { id: "ot6", name: "Zen Den Studio",       targetType: "Studio",  contactName: "Naomi Chase",   email: "naomi@zenden.com",  phone: "555-0306", location: "Concord, CA",     source: "Google",        warmth: "Cold", priority: "Low",    status: "Not contacted",     responseStatus: "Pending",     outreachMessage: "",               lastContact: "",           nextFollowUp: "2026-06-20", revenuePotential: 800,  partnerId: "", notes: "Found via Google Maps. Small studio. Low priority but nearby." },
    { id: "ot7", name: "Sacred Space",         targetType: "Studio",  contactName: "Leah Odom",     email: "leah@sacred.com",   phone: "555-0307", location: "Martinez, CA",     source: "Instagram DM",  warmth: "Cold", priority: "Low",    status: "Messaged",          responseStatus: "Ghosted",     outreachMessage: "template_intro", lastContact: "2026-05-28", nextFollowUp: "2026-06-12", revenuePotential: 1000, partnerId: "", notes: "Sent two messages. No reply. May re-engage next month." },
  ],
  testimonials: [
    { id: "tm1", name: "Dana Wolfe — Letting Go",         clientId: "c6", sessionId: "s1", status: "Published", type: "Written",    content: "I didn't expect to cry. I didn't expect to feel that much. But somewhere in the middle of that session, something I had been holding for years finally moved. I left the room feeling lighter than I had in a long time. This isn't just breathwork — it's a doorway.",                                                                                          bestQuote: "Something I had been holding for years finally moved.",          beforeSummary: "Grieving a loss, carrying unexpressed emotion, feeling stuck", afterSummary: "Deep release, emotional lightness, renewed sense of clarity",   themes: ["Emotional release","Grief processing","Emotional breakthrough"], permissionReceived: true,  useOnWebsite: true,  useOnSocial: true,  firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-02", datePublished: "2026-06-05", notes: "Used on homepage hero section" },
    { id: "tm2", name: "Sam Rivera — New Moon ceremony",  clientId: "c5", sessionId: "s3", status: "Published", type: "Written",    content: "I've tried meditation, therapy, and journaling. Nothing prepared me for how quickly breathwork cut through the noise. Within 15 minutes I was somewhere I hadn't been in years — fully present, no anxiety, just breath. I've been back four times since.",                                                                                     bestQuote: "Within 15 minutes I was somewhere I hadn't been in years.",      beforeSummary: "Chronic anxiety, difficulty being present",                  afterSummary: "Immediate calm, commitment to practice, bought 3-pack",        themes: ["Anxiety relief","Stress relief","Nervous system reset"],         permissionReceived: true,  useOnWebsite: true,  useOnSocial: true,  firstNameOnly: false, videoUrl: "",   dateReceived: "2026-04-08", datePublished: "2026-04-12", notes: "Top converting testimonial on booking page" },
    { id: "tm3", name: "Maya Chen — June 10 session",     clientId: "c2", sessionId: "s2", status: "Approved",  type: "Written",    content: "I came in burned out and skeptical. I left with a full body reset. I slept better that night than I had in months and woke up actually looking forward to my day. Whatever this is, more people need to know about it.",                                                                                                              bestQuote: "I came in burned out and skeptical. I left with a full body reset.", beforeSummary: "Burnout, poor sleep, high stress job",                    afterSummary: "Deep sleep that night, energy shift, interest in private session", themes: ["Stress relief","Improved sleep","Emotional breakthrough"],      permissionReceived: true,  useOnWebsite: true,  useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-11", datePublished: "",           notes: "Approved — schedule for social this week" },
    { id: "tm4", name: "Priya Nair — Sunday Slow Down",   clientId: "c4", sessionId: "s3", status: "Received",  type: "Written",    content: "I came because Sam wouldn't stop talking about it. I stayed because something in me woke up. I've never cried and laughed in the same breath before. My body knew things my mind had forgotten.",                                                                                                                          bestQuote: "My body knew things my mind had forgotten.",                      beforeSummary: "Skeptical, came via referral",                               afterSummary: "Emotional awakening, high referral potential",                  themes: ["Emotional release","Spiritual growth","Mental clarity"],        permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-08", datePublished: "",           notes: "Need to confirm permission before using" },
    { id: "tm5", name: "Chris Okafor — first session",    clientId: "c3", sessionId: "s1", status: "Breakthrough noted", type: "Written", content: "",                                                                                                                                                                                                                                                                                                               bestQuote: "",                                                               beforeSummary: "First-timer, strong nervous system response during session",  afterSummary: "Hasn't been asked yet — testimonial request overdue",          themes: ["Stress relief","Nervous system reset"],                          permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "",           datePublished: "",           notes: "Breakthrough observed 6/1. Request not yet sent." },
  ],
  templates: [
    {
      id: "tpl1", name: "Studio outreach — intro",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 4,
      subject: "Breathwork for {{studioName}} — a revenue partnership",
      body: `Hi {{contactName}},

I'm {{yourName}}, founder of Simply Breathe. I help wellness studios add high-engagement breathwork experiences that their community loves — and that generate meaningful additional revenue for the studio.

Here's how it works: I bring the session, the music, the facilitation, and the follow-up. You provide the space and promote to your list. We split the revenue. No risk, no cost to you.

Studios like {{referenceStudio}} have seen {{avgAttendance}} attendees per session and strong re-booking rates.

Would you be open to a 15-minute call to see if this is a fit for {{studioName}}?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{yourName}}, {{referenceStudio}}, {{avgAttendance}}",
      notes: "Use for cold and warm intro. Personalize with referenceStudio name for warm intros.",
    },
    {
      id: "tpl2", name: "Studio follow-up — no response",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 2,
      subject: "Following up — Simply Breathe × {{studioName}}",
      body: `Hi {{contactName}},

I wanted to follow up on my message from {{lastContactDate}}. I completely understand life gets busy.

I'd love just 15 minutes to show you what the experience has looked like at studios similar to yours. No obligation — just a conversation.

If timing isn't right right now, I'm happy to circle back in a few weeks. Just let me know.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{lastContactDate}}, {{yourName}}",
      notes: "Send 5–7 days after initial outreach with no response.",
    },
    {
      id: "tpl3", name: "Demo invitation",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 3,
      subject: "Let me bring the experience to {{studioName}}",
      body: `Hi {{contactName}},

The best way to understand what Simply Breathe is about is to feel it.

I'd love to offer a complimentary 30-minute breathwork experience for you and a small group at {{studioName}} — no commitment required. I'll handle everything: music, facilitation, and a brief debrief afterward.

It's the fastest way to know if this resonates with your community.

Are you open to {{proposedDate}}?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{proposedDate}}, {{yourName}}",
      notes: "Best used after initial interest shown. Keep it low-commitment.",
    },
    {
      id: "tpl4", name: "Pilot proposal",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 1,
      subject: "4-week breathwork pilot for {{studioName}} — proposal",
      body: `Hi {{contactName}},

Thank you for the conversation last week — I left genuinely excited about what this could be for {{studioName}} and your community.

I'd like to propose a 4-week pilot:

• {{sessionsPerMonth}} sessions per month
• Revenue split: {{revSplit}}
• Ticket price: {{ticketPrice}} per person
• Minimum attendance: {{minAttendance}} to cover costs
• I handle: facilitation, music, setup, follow-up emails
• You handle: space, promotion to your list, social posts

I've attached a one-page overview. I'm also happy to jump on a call to walk through any questions.

Looking forward to building something great together.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{sessionsPerMonth}}, {{revSplit}}, {{ticketPrice}}, {{minAttendance}}, {{yourName}}",
      notes: "Personalize numbers from the partner record. Attach one-pager PDF.",
    },
    {
      id: "tpl5", name: "Agreement follow-up",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 0,
      subject: "Quick check-in on our agreement — {{studioName}}",
      body: `Hi {{contactName}},

I wanted to circle back on the partnership agreement I sent over on {{sentDate}}.

Is there anything you'd like to discuss, clarify, or adjust before we move forward? I'm happy to get on a quick call if that's easier.

Once we have the agreement signed, I can get the booking page and QR code set up within a few days so we can start promoting.

Looking forward to it.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{sentDate}}, {{yourName}}",
      notes: "Send 4–5 days after agreement sent with no response.",
    },
    {
      id: "tpl6", name: "Event reminder",
      category: "Operations", channel: "Email", linkedTo: "sessions", usageCount: 7,
      subject: "Your session is coming up — {{sessionName}}",
      body: `Hi {{clientName}},

Just a reminder that {{sessionName}} is happening:

📅 {{sessionDate}}
🕐 {{sessionTime}}
📍 {{location}}

A few things to know:
• Arrive 5–10 minutes early so we can get settled
• Wear comfortable clothing you can breathe in
• Bring a water bottle
• No food 2 hours before if possible

The waiver link (if needed): {{waiverLink}}

I can't wait to hold space for you. See you soon. 🌿

Warm,
{{yourName}}`,
      variables: "{{clientName}}, {{sessionName}}, {{sessionDate}}, {{sessionTime}}, {{location}}, {{waiverLink}}, {{yourName}}",
      notes: "Send 24–48 hours before the session.",
    },
    {
      id: "tpl7", name: "Thank-you after session",
      category: "Post-Session", channel: "SMS", linkedTo: "clients", usageCount: 12,
      subject: "",
      body: `Hi {{clientName}} 💙

Thank you so much for being in the room today. What you did took courage — and I hope you can feel the shift.

Take it slow tonight. Rest, hydrate, and let your body integrate. If anything comes up — emotions, memories, questions — that's normal and beautiful.

I'm here if you need anything.

— {{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send within 2 hours of session ending. Keep it warm and brief.",
    },
    {
      id: "tpl8", name: "24-hour check-in",
      category: "Post-Session", channel: "SMS", linkedTo: "clients", usageCount: 9,
      subject: "",
      body: `Hi {{clientName}} 🌿

Checking in from yesterday. How are you feeling today?

Sometimes the integration happens slowly — sleep, emotions, moments of unexpected clarity. All of it is part of the process.

Anything you want to share or ask? I'm here.

— {{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send ~24 hours after session. Creates the opening for deeper conversation.",
    },
    {
      id: "tpl9", name: "72-hour offer follow-up",
      category: "Sales & Offers", channel: "Email", linkedTo: "clients", usageCount: 6,
      subject: "Continuing the work — an invitation for you",
      body: `Hi {{clientName}},

I hope you've had a chance to settle into what came up in our last session. The shift you experienced doesn't have to be a one-time thing.

For those who feel called to go deeper, I'm offering {{offerDetails}} — which gives us the space to do more sustained, meaningful work together.

If that resonates, here's how to move forward: {{bookingLink}}

No pressure at all. But if something is stirring in you, this is the next step.

With care,
{{yourName}}`,
      variables: "{{clientName}}, {{offerDetails}}, {{bookingLink}}, {{yourName}}",
      notes: "Send 48–72 hours after session. Match offer to client's experience.",
    },
    {
      id: "tpl10", name: "Testimonial request",
      category: "Engagement", channel: "Email", linkedTo: "clients", usageCount: 5,
      subject: "Would you share your experience?",
      body: `Hi {{clientName}},

It means a lot that you showed up for this work. What you experienced is real — and it matters.

If you're open to it, I'd love to hear about your experience in a few sentences. Even just: what shifted, what you noticed, or what you'd tell someone considering their first session.

Your words could be exactly what someone else needs to hear to take the first step.

You can reply directly to this email — I'll handle the rest.

Thank you for trusting the process. 🙏

With gratitude,
{{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send 5–7 days after session. Best results when sent after breakthrough sessions.",
    },
    {
      id: "tpl11", name: "Referral request",
      category: "Engagement", channel: "Email", linkedTo: "clients", usageCount: 3,
      subject: "Know someone who could use this?",
      body: `Hi {{clientName}},

Thank you for continuing to show up. You've been on such a beautiful journey and I'm so grateful for the trust you've placed in this work.

If there's someone in your life who might benefit — a friend who's burned out, anxious, stuck, or just ready for something to shift — I'd be honored if you'd share my info with them.

Here's a simple way to do it: just forward them this email or send them my booking link: {{bookingLink}}

As a thank-you for any referral who books, {{referralReward}}.

You've already changed your own life. Imagine what it could mean to help someone else take the first step.

With so much appreciation,
{{yourName}}`,
      variables: "{{clientName}}, {{bookingLink}}, {{referralReward}}, {{yourName}}",
      notes: "Best sent to Advocates and clients with 3+ sessions attended.",
    },
    {
      id: "tpl12", name: "Rebooking invitation",
      category: "Sales & Offers", channel: "SMS", linkedTo: "clients", usageCount: 8,
      subject: "",
      body: `Hi {{clientName}} 🌿

I'd love to see you again. {{nextSessionDetails}} — would you like to grab a spot?

Spaces fill fast. Here's the link: {{bookingLink}}

Hope to breathe with you soon. 💙
— {{yourName}}`,
      variables: "{{clientName}}, {{nextSessionDetails}}, {{bookingLink}}, {{yourName}}",
      notes: "Send 7–10 days after last session if no next session is booked.",
    },
    {
      id: "tpl13", name: "Private session offer",
      category: "Sales & Offers", channel: "Email", linkedTo: "clients", usageCount: 2,
      subject: "A personal invitation — 1:1 breathwork with {{yourName}}",
      body: `Hi {{clientName}},

I've been thinking about your journey since our last session. What came up for you is important — and I believe there's more depth available if we create the space for it.

I'd like to invite you to a private 1:1 breathwork session. Unlike a group setting, we can tailor the entire experience to exactly what you're carrying and where you want to go.

Private sessions are {{privateSessionPrice}} and run {{privateSessionLength}} minutes. I only hold a limited number each month.

If this feels right, reply to this email or book directly here: {{bookingLink}}

With care,
{{yourName}}`,
      variables: "{{clientName}}, {{yourName}}, {{privateSessionPrice}}, {{privateSessionLength}}, {{bookingLink}}",
      notes: "Offer to clients who've had breakthroughs or attended 2+ group sessions.",
    },
    {
      id: "tpl14", name: "Corporate inquiry response",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 1,
      subject: "Re: Breathwork for {{companyName}} — let's talk",
      body: `Hi {{contactName}},

Thank you so much for reaching out. Corporate wellness is something I'm genuinely passionate about, and I'd love to explore how breathwork could support your team at {{companyName}}.

Here's what I typically offer for corporate groups:

• 60-minute breathwork experience for teams of 10–50
• Options: lunch & learn, offsite, quarterly reset, or recurring monthly
• Fully facilitated — I bring everything needed
• Focus areas: stress management, nervous system regulation, team presence, creative reset

Investment starts at {{corporateRate}} for groups up to {{groupSize}}.

I'd love to set up a 20-minute call to learn more about your team's needs. Would {{proposedDate}} work?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{companyName}}, {{corporateRate}}, {{groupSize}}, {{proposedDate}}, {{yourName}}",
      notes: "Respond within 24 hours. Always offer a specific call time.",
    },
  ],
  expenses: [
    { id: "exp1",  date: "2026-06-01", vendor: "Amazon",           description: "Wired headsets (x2)",                  amount: 189.99, category: "Equipment & Supplies",      paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "", linkedPartner: "", notes: "Primary + backup headset for sessions" },
    { id: "exp2",  date: "2026-06-01", vendor: "Mindbody",         description: "Booking software monthly subscription", amount: 129.00, category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
    { id: "exp3",  date: "2026-06-03", vendor: "Meta Ads",         description: "Instagram session promotion",           amount: 75.00,  category: "Marketing & Advertising",  paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s1", linkedPartner: "", notes: "Letting Go & Rebirth promo — 3 bookings attributed" },
    { id: "exp4",  date: "2026-06-05", vendor: "Spotify for Artists", description: "Music licensing — monthly",          amount: 9.99,   category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
    { id: "exp5",  date: "2026-06-08", vendor: "Whole Foods",      description: "Water, tissues, mint tea — session supplies", amount: 34.50, category: "Equipment & Supplies", paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s2", linkedPartner: "sp1", notes: "YogaSix session supplies" },
    { id: "exp6",  date: "2026-06-10", vendor: "Mileage",          description: "Driving to YogaSix Walnut Creek (22mi x2)", amount: 27.06, category: "Travel & Transport",    paymentMethod: "Cash",        taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s2", linkedPartner: "sp1", notes: "IRS rate $0.67/mi" },
    { id: "exp7",  date: "2026-06-11", vendor: "Canva Pro",        description: "Design tool — annual plan (monthly equiv)", amount: 12.99, category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true, recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "Flyers, social graphics" },
    { id: "exp8",  date: "2026-05-15", vendor: "David Elliott",    description: "Advanced breathwork certification",     amount: 497.00, category: "Education & Training",     paymentMethod: "Bank Transfer", taxDeductible: true, recurring: false, recurringFreq: "One-time", linkedSession: "", linkedPartner: "", notes: "CPD hours — annual" },
    { id: "exp9",  date: "2026-05-20", vendor: "Next Insurance",   description: "General liability — monthly",           amount: 46.00,  category: "Insurance",                paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "GL + professional indemnity bundle" },
    { id: "exp10", date: "2026-05-01", vendor: "Squarespace",      description: "Website hosting — annual (monthly equiv)", amount: 19.17, category: "Administrative",         paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
  ],
  registrations: [],
  payments: [],
};
