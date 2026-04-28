# 🚨 ResQnet — Tactical Emergency Response Platform

> Predict. Guide. Verify. — A protocol-driven crisis response platform for hotels, venues and resorts.

A full-stack hackathon demo with **separate guest and employee experiences**, real-time WebSocket coordination, mesh-network resilience visualization, BLE Guardian Band tracking, and a 4-module emergency response system (Fire / Medical / Security / Hazard).

---

## ⚡ Quick Start (30 seconds)

```bash
# 1. Install everything
npm install

# 2. Run frontend + backend together
npm run dev
```

Then open **http://localhost:5173**

The backend runs on `:4000` and the Vite dev server on `:5173` proxies `/api` and `/socket.io` to it. You'll see live logs from both processes.

---

## 🎬 Demo Flow (60 seconds — judges will love this)

### Setup
1. Open the app — you land on the **portal selection** screen
2. Open a **second browser window** side-by-side

### In Window 1 → Guest Mode
1. Click **GUEST**
2. Pick `Aryan Kumar (g-01)` to pair their wristband
3. You're on the calm guest dashboard — show the Guardian Band card, the 4 emergency buttons, the family panel

### In Window 2 → Employee Mode
1. Click **EMPLOYEE**
2. Quick-fill `Commander` (admin) and click **ACCESS COMMAND**
3. You see the full **Tactical Override** dashboard with live SOS feed, gauges, 4 modules

### The Wow Moment
1. **In Guest window:** tap **FIRE**. Watch the SOS dispatch.
2. **In Employee window:** the tactical command center now shows the active incident, SOS feed updates in real time, the responder roster animates.
3. Click on the active **FIRE** incident to enter the tactical fire module.
4. Show the live PPS engine running, density updates, the staggered evacuation, the I'M SAFE button.
5. **Click the 3D View button** (top-left of the map) → full Three.js scene of the floor with band-wearers (green spheres), app users (blue cuboids), staff (cyan), responders (red), and the fire zone glowing red. Drag to rotate, scroll to zoom.
6. Click **CONFIRM EVAC COMPLETE** → the verification ring spins up showing 200/200 accounted.
7. Hit **SYSTEM READY → COMMAND** to return.

### Bonus
- **3D Tactical View** (purple card on employee home) — rotate/zoom the entire floor in real time
- Click **BLE Mesh: View Topology** on the employee home — 19 nodes, animated relay packets, latency stats.
- Click **Guardian Band Diagnostic** — full BLE scan animation → device details with live HR, RSSI, firmware version.
- Try the **Silent Alert Mode** in the Security module — guests stay unaware while staff coordinate.
- Watch the gas spread in the **Hazard module** — predictive timeline at +30s/+60s/+90s/+120s.

---

## 🎽 Who gets a Guardian Band?

Guardian Bands are worn by **vulnerable guests**:
- **Children under 10** (e.g. Aryan, age 8 — drowning risk monitor)
- **Seniors over 60** (e.g. Kavita, age 62 — fall detection)

Everyone else uses the **ResQnet phone app** with the same emergency features but standard smartphone interaction. On the tactical map:
- **Green ringed circles** = Guardian Band wearers
- **Blue squares** = Phone app users
- **Cyan circles** = Staff
- **Red cylinders** = Responders

---

## 🔐 Demo Credentials

### Employee
| Username  | Password    | Role        |
|-----------|-------------|-------------|
| `admin`   | `admin123`  | Commander   |
| `staff`   | `staff123`  | Sergeant    |
| `medic`   | `medic123`  | Medic       |

### Guest
Pick any wristband from the pairing list — Aryan, Priya, Kavita, or Rohan.

---

## 🧠 What's Inside

### Frontend (React + Vite + Tailwind + Framer Motion)
- **Login portal** with separate Guest (BLE band pairing) and Employee (credentialed) flows
- **Guest dashboard** — calm, large buttons, family tracking, Guardian Band status, notifications from staff
- **Guest emergency module** — simplified evacuation guidance, voice instructions, family safety tracking, big "I'M SAFE" button
- **Employee command center** — tactical dashboard with 4 module cards, live SOS feed, active incident roster, system gauges
- **Fire module** — animated map with PPS engine, staggered evacuation, density visualization, responder roster, I'M SAFE → verification ring
- **Medical module** — patient tracking map, Guardian Band vitals (fall, immobility, HR, drown risk), responder live feed (15s auto-update), 3-min auto-escalation timer
- **Security module** — full-floor real-time tracking dashboard, restricted zone alerts, **Silent Alert Mode** toggle, lockdown control
- **Hazard module** — animated growing gas spread, wind direction arrows, predictive risk timeline, hazmat dispatch
- **Dispatch console** — analytics summary, responder roster, incidents-by-type chart, bottleneck zones, full incident log
- **BLE Mesh modal** — live network topology with 19 nodes, animated packet relay, latency stats, hop count
- **Guardian Band modal** — full BLE scan animation with diagnostic readout

### Backend (Express + Socket.IO)
- REST: `/api/auth/login`, `/api/incidents`, `/api/zones`, `/api/responders`, `/api/families`, `/api/evidence`, `/api/guest-alerts`, `/api/analytics/{summary,bottlenecks}`
- WebSocket events: `sos:trigger`, `incident:new`, `responder:feed`, `family:update`, `pps:update`, `density:update`, `hazard:spread`, `auto_escalate:alert`, `theme:severity`
- **PPS engine** — predicts crowd density inflow into adjacent zones, returns staggered evacuation actions (`EVACUATE_NOW`, `HOLD_30S`, `DIVERT`)
- **Hazard spread engine** — BFS-based contamination simulation with 2-min/5-min/10-min projections
- **Evacuation router** — BFS pathfinding through floor plan adjacency graph, finds nearest safe exit avoiding blocked zones
- **2-second simulation loop** — drifts densities, runs PPS, broadcasts to all clients
- **Auto-escalation** — alerts when responder is stationary >3min

---

## 📋 Features Mapped to Requirements

| Feature                       | Where It Lives                                    | Type                |
|-------------------------------|---------------------------------------------------|---------------------|
| 4 emergency categories        | Login → Guest/Employee home                       | Core UI             |
| Smart Evacuation Navigation   | Fire & Hazard modules                             | Animated map (BFS)  |
| Panic Propagation Score       | Fire module + global engine                       | Stat card + bars    |
| Voice-Guided Evacuation       | Fire & Hazard & Guest modules                     | Rotating banner + speechSynthesis |
| Intelligent SOS Dispatcher    | All 4 modules + guest home                        | SOS banner card     |
| Real-Time Rescue Visibility   | All modules                                       | Responder ETA card  |
| Offline Safety Mode           | Login screen + employee home pill                 | Status indicator    |
| Guardian Band                 | Guest home + Medical module + dedicated modal     | Vitals panel        |
| Live Patient Tracking         | Medical module                                    | Map view            |
| Auto Escalation               | Medical module                                    | 3-min timer alarm   |
| Emotional Reassurance         | Medical & Guest modules                           | Rotating messages   |
| Real-Time Tracking Dashboard  | Security module                                   | Map with dot grid   |
| Silent Alert Mode             | Security module                                   | Toggle              |
| Hazard Mapping                | Hazard module                                     | Spread overlay      |
| Predictive Risk Spread        | Hazard module                                     | Animated simulation |
| Evacuation Verification       | Fire module → end-of-demo screen                  | Progress ring       |
| Mesh Resilience Protocol      | Login screen + employee home + dedicated modal    | Topology viz        |
| Separate Guest/Employee UI    | **Different login paths, different routes**       | Full role split     |

---

## 🏗 Project Structure

```
resqnet/
├── server/
│   ├── server.js           # Express + Socket.IO
│   ├── data/               # floorPlan, guests, responders, users
│   └── engines/            # PPS, hazard spread, evacuation router
├── src/
│   ├── App.jsx             # Router + protected routes
│   ├── main.jsx            # React entry
│   ├── index.css           # Design system
│   ├── lib/                # store, socket, api, helpers
│   ├── components/         # FloorMap, MeshModal, GuardianBandModal, etc.
│   ├── screens/
│   │   ├── LoginScreen.jsx
│   │   ├── guest/
│   │   │   ├── GuestHome.jsx
│   │   │   └── GuestModule.jsx
│   │   └── employee/
│   │       ├── EmployeeHome.jsx
│   │       ├── EmployeeFire.jsx
│   │       ├── EmployeeMedical.jsx
│   │       ├── EmployeeSecurity.jsx
│   │       ├── EmployeeHazard.jsx
│   │       └── EmployeeDispatch.jsx
│   └── data/               # frontend copies of floorPlan etc.
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## 🎨 Design System

**Typography:** Bebas Neue (display) + Inter (body) + JetBrains Mono (numerics)
**Color tokens:** Fire `#ef4444`, Medical `#06b6d4`, Security `#f59e0b`, Hazard `#eab308`, Safe `#10b981`
**Aesthetic:** Dark tactical command — frosted glass cards, BLE-blue accent network grid, subtle grain overlay, severity glow ambient on incident screens

---

## 🚀 Production Notes

- All animations are CSS-based or Framer Motion (no JS-driven layout thrash)
- Socket.IO reconnects automatically; client hydrates from `state:snapshot` on connect
- Session is persisted in `localStorage` (key: `resqnet_session`)
- Guest and Employee sessions are completely isolated route-wise — protected route components redirect to the correct portal

---

## 📝 What Real Production Would Add

- BLE hardware integration (currently mocked but the data shape matches real Guardian Band specs)
- Real PA system integration
- Persistent DB (currently in-memory)
- Multi-floor support
- Multi-language voice synthesis
- Real evidence upload (currently base64 in-memory)

---

Built for hackathon judges. Built to win. 🏆
