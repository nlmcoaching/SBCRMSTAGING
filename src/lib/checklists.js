import { C } from "./theme.js";

export const SESSION_CHECKLIST = [
  // Pre-session — studio
  { id: "room_booked",        label: "Room booking confirmed with studio",          phase: "Pre-Session",  virtual: false },
  { id: "capacity_set",       label: "Capacity communicated to studio",             phase: "Pre-Session",  virtual: false },
  { id: "promo_sent",         label: "Promotional push sent to studio list",        phase: "Pre-Session",  virtual: false },
  { id: "equipment_packed",   label: "Equipment packed (headset, music, props)",    phase: "Pre-Session",  virtual: false },
  { id: "zoom_tested",        label: "Zoom setup & audio tested",                  phase: "Pre-Session",  virtual: true  },
  { id: "room_setup_done",    label: "Room setup confirmed",                        phase: "Pre-Session",  virtual: false },
  { id: "audio_tested",       label: "Music & headset tested",                     phase: "Pre-Session",  virtual: false },
  { id: "tech_room_setup",    label: "Technical room setup complete, music and headsets tested", phase: "Pre-Session", virtual: false },
  { id: "space_prepared",     label: "Personal space prepared (quiet, good light)", phase: "Pre-Session",  virtual: true  },
  { id: "water_nearby",       label: "Water nearby for you",                        phase: "Pre-Session",  virtual: true  },
  // Post-session — shared
  { id: "attendance_logged",  label: "Attendance count logged",                     phase: "Post-Session", virtual: false },
  { id: "revenue_recorded",   label: "Revenue recorded & split calculated",         phase: "Post-Session", virtual: false },
  { id: "revenue_virtual",    label: "Revenue recorded",                            phase: "Post-Session", virtual: false },
  { id: "studio_paid",        label: "Studio split paid or invoiced",               phase: "Post-Session", virtual: false },
  { id: "testimonials_done",  label: "Testimonials captured from attendees",        phase: "Post-Session", virtual: true  },
  { id: "followup_sent",      label: "24h follow-up email sent to attendees",       phase: "Post-Session", virtual: true  },
  { id: "rebook_offered",     label: "Rebook offer made to attendees",              phase: "Post-Session", virtual: true  },
  { id: "referrals_asked",    label: "Referrals requested from advocates",          phase: "Post-Session", virtual: true  },
  { id: "notes_written",      label: "Session notes & learnings written",           phase: "Post-Session", virtual: true  },
];

/* ── EQUIPMENT & SETUP CHECKLIST ── */
export const EQUIP_CHECKLIST_PHASES = [
  {
    id: "pack", label: "Pack & Equipment", color: "#2E6FB0", icon: "🎒",
    items: [
      { id: "eq_headsets",       label: "Primary headsets packed & charged",          virtual: false },
      { id: "eq_backup_headset", label: "Backup headset packed",                      virtual: false },
      { id: "eq_chargers",       label: "Chargers & power banks in bag",              virtual: false },
      { id: "eq_extension",      label: "Extension cords packed",                     virtual: false },
      { id: "eq_eye_masks",      label: "Eye masks (count matches registration)",      virtual: false },
      { id: "eq_mats",           label: "Mats/blankets confirmed (studio provided or packed)", virtual: false },
      { id: "eq_speaker",        label: "Speaker / audio backup ready",               virtual: false },
    ],
  },
  {
    id: "virtual_setup", label: "Virtual Setup", color: "#2E6FB0", icon: "💻",
    items: [
      { id: "eq_zoom_tested",    label: "Zoom audio, video & screen share tested",    virtual: true  },
      { id: "eq_headset_v",      label: "Headset charged and tested",                 virtual: true  },
      { id: "eq_camera",         label: "Camera positioned, background clean & lit",  virtual: true  },
      { id: "eq_do_not_disturb", label: "Phone on DND, notifications silenced",       virtual: true  },
    ],
  },
  {
    id: "content", label: "Content & Tech", color: "#6B5CE7", icon: "🎵",
    items: [
      { id: "eq_playlist",       label: "Playlist/journey downloaded offline",         virtual: false },
      { id: "eq_playlist_v",     label: "Playlist/journey ready & queued",             virtual: true  },
      { id: "eq_wifi",           label: "Wi-Fi confirmed at venue (or offline ready)", virtual: false },
      { id: "eq_wifi_v",         label: "Strong internet connection confirmed",        virtual: true  },
      { id: "eq_waiver_qr",      label: "Waiver QR code printed or accessible",       virtual: false },
      { id: "eq_checkin_list",   label: "Check-in list printed or on device",         virtual: false },
    ],
  },
  {
    id: "venue", label: "Venue & Day-Of", color: "#D9892B", icon: "📍",
    items: [
      { id: "eq_arrival_time",   label: "Arrival time confirmed (45–60 min early)",   virtual: false },
      { id: "eq_space_v",        label: "Personal space quiet, door locked/sign posted", virtual: false },
      { id: "eq_room_lighting",  label: "Room lighting tested & adjusted",            virtual: false },
      { id: "eq_lighting_v",     label: "Lighting flattering and distraction-free",   virtual: false },
      { id: "eq_water_tissues",  label: "Water & tissues available in room",          virtual: false },
    ],
  },
  {
    id: "safety", label: "Safety & Facilitation", color: "#4A8C6F", icon: "🛡️",
    items: [
      { id: "eq_emergency",      label: "Emergency contact process confirmed",         virtual: false },
      { id: "eq_contraindication", label: "Contraindication reminder shared with attendees", virtual: true },
      { id: "eq_closing_script", label: "Closing/integration script reviewed",        virtual: true  },
    ],
  },
];
export const EQUIP_CHECKLIST = EQUIP_CHECKLIST_PHASES.flatMap(p => p.items.map(i => ({ ...i, phase: p.id })));
export const emptyEquipChecklist = () => Object.fromEntries(EQUIP_CHECKLIST.map(i => [i.id, false]));

/** Equip items shown under Pre-Session in SessionChecklistPanel (virtual mode only, not the Virtual Setup phase block) */
export const VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS = new Set([
  "eq_camera", "eq_do_not_disturb",
  "eq_playlist_v", "eq_wifi_v",
]);

export function virtualEquipPhaseItems(phaseId) {
  const phase = EQUIP_CHECKLIST_PHASES.find((p) => p.id === phaseId);
  if (!phase) return [];
  return phase.items.filter((i) => i.virtual && !VIRTUAL_PRE_SESSION_MOVED_EQUIP_IDS.has(i.id));
}

export const SESSION_CHECKLIST_PHASES = ["Pre-Session", "Post-Session"];
export const SESSION_PHASE_COLOR = { "Pre-Session": C.brand, "Post-Session": "#4A8C6F" };
export const emptySessionChecklist = () => Object.fromEntries(SESSION_CHECKLIST.map((i) => [i.id, false]));
