🐰 BUNNY MD - WhatsApp Bot

<div align="center">
  <img src="https://i.ibb.co/Mdg2Fkd/file-00000000f41871fdb744b8a6b7b612fa.png" alt="BUNNY MD" width="200">
  
  **The Most Advanced WhatsApp MD Bot with Baileys + Supabase**
  
  [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com)
  [![WhatsApp Bot](https://img.shields.io/badge/WhatsApp-Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/255780470905)
  [![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
  [![Baileys](https://img.shields.io/badge/Baileys-6.7.18-000000?style=for-the-badge)](https://github.com/WhiskeySockets/Baileys)
</div>

---

✨ Features

| **Category** | **Features** |
| --- | --- |
| **Connection** | QR Code + Pair Code Login, Auto Reconnect, Session Storage |
| **Database** | Supabase Realtime Integration, Cloud Session Backup |
| **Commands** | Downloaders, AI Chat, Group Manager, Owner Tools |
| **Tech Stack** | Baileys 6.7.18, Node.js 20.x, Express, Socket.IO |
| **Deployment** | One-Click Render Deploy, 24/7 Online, Zero Config |

---

🚀 Quick Start

**1. Get Your WhatsApp Session**

After deploying, visit your bot's pair page to connect WhatsApp:

**👉 [Click Here to Open Pair Page](/pair.html)**

> **Important:** Use `/pair.html` not `/pair` - The `.html` extension is required

Scan the QR code with WhatsApp > Linked Devices > Link a Device

**2. Deploy to Render**

1. Fork this repository
2. [Deploy to Render](https://render.com) as a Web Service
3. Add Environment Variables:
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NODE_VERSION=20.11.1
4. Deploy and visit `/pair.html` to scan QR

---

📋 Requirements

- **Node.js** `20.11.1` - Required for Baileys stability
- **Supabase Account** - For session storage and realtime settings
- **Render Account** - For 24/7 free hosting

---

🔧 Environment Variables

Create these in Render Dashboard > Environment:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NODE_VERSION=20.11.1
OWNER_NUMBER=255780470905
BOT_NAME=BUNNY MD
PREFIX=!
---

📱 Commands
**Command**	**Category**	**Description**
`!play <song>`	Downloader	Download music from YouTube
`!alive`	General	Check if bot is online
`!menu`	General	Show all commands
`!ping`	General	Check response time
`!setprefix <symbol>`	Owner	Change command prefix
`!setbotname <name>`	Owner	Change bot name
`!setowner <number>`	Owner	Change owner number
---

🗄️ Database Setup

Run this SQL in your Supabase SQL Editor:
-- ============================================
-- BUNNY MD - COMPLETE DATABASE SETUP
-- Owner: Lupin Starnley - 255780470905
-- ============================================

-- 1. DROP OLD TABLES IF EXIST
DROP TABLE IF EXISTS public.b_settings CASCADE;
DROP TABLE IF EXISTS public.bu_sessions CASCADE;

-- 2. CREATE b_settings TABLE
CREATE TABLE public.b_settings (
  id TEXT PRIMARY KEY DEFAULT 'BUNNY_DEFAULT',
  botname TEXT NOT NULL DEFAULT 'BUNNY MD',
  owner_number TEXT NOT NULL DEFAULT '255780470905',
  owner_name TEXT NOT NULL DEFAULT 'Lupin Starnley',
  prefix TEXT NOT NULL DEFAULT '!',
  public_mode BOOLEAN NOT NULL DEFAULT false,
  antilink BOOLEAN NOT NULL DEFAULT false,
  antispam BOOLEAN NOT NULL DEFAULT false,
  autoread BOOLEAN NOT NULL DEFAULT false,
  autotyping BOOLEAN NOT NULL DEFAULT false,
  autoviewstatus BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE bu_sessions TABLE
CREATE TABLE public.bu_sessions (
  id TEXT PRIMARY KEY DEFAULT 'full_session',
  data TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ENABLE RLS + POLICIES
ALTER TABLE public.b_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bu_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for service role" ON public.b_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Enable read for anon" ON public.b_settings
  FOR SELECT TO anon USING (true);

CREATE POLICY "Enable all for service role" ON public.bu_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. INSERT DEFAULT DATA
INSERT INTO public.b_settings (
  id, botname, owner_name, owner_number, prefix,
  public_mode, antilink, antispam, autoread, autotyping, autoviewstatus
) VALUES (
  'BUNNY_DEFAULT', 'BUNNY MD', 'Lupin Starnley', '255780470905', '!',
  false, false, false, false, false, false
);

INSERT INTO public.bu_sessions (id, data) 
VALUES ('full_session', NULL);

-- 6. ENABLE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;
  CREATE PUBLICATION supabase_realtime;
COMMIT;

ALTER PUBLICATION supabase_realtime ADD TABLE public.b_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bu_sessions;

-- 7. AUTO UPDATE TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b_settings_updated_at
  BEFORE UPDATE ON public.b_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bu_sessions_updated_at
  BEFORE UPDATE ON public.bu_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
*After running SQL:* Go to `Database` → `Replication` → Enable `b_settings` and `bu_sessions`.

---

🌐 Live Demo

*Pair Page:* `https://bunny-md.onrender.com/pair.html`

*Note:* Always include `.html` at the end of the pair URL

---

👨‍💻 Developer

*Lupin Starnley* - _Creator & Owner of BUNNY MD_

- GitHub: https://github.com/zbunnytech
- WhatsApp: https://wa.me/255780470905
- Organization: Bunny Tech

---

⚠️ Important Notes

1. *Node Version*: Must use Node `20.11.1` - Node 26 breaks QR generation
2. *Pair URL*: Always use `/pair.html` with the `.html` extension
3. *Supabase*: Requires `ws` package for Node 20 WebSocket support
4. *Session*: Sessions are stored in Supabase `bu_sessions` table
5. *Build Command*: Use `npm install --legacy-peer-deps` on Render

---

🐛 Troubleshooting
**Problem**	**Solution**
QR not showing	Use Node 20.11.1 + Check `/pair.html`
`Connection closed` loop	Delete `bu_sessions` table data and rescan
`WebSocket` error	Install `ws` package and update `supabase.js`
Bot offline	Check Render logs for `✅ WhatsApp connected`
---

📄 License

This project is licensed under the Bunny MD Proprietary License.

Copyright (c) 2025-2026 Bunny Tech - Lupin Starnley. All Rights Reserved.

Unauthorized commercial use, redistribution without attribution, or removal of credits is strictly prohibited.

---

<div align="center">
  <img src="https://i.ibb.co/Mdg2Fkd/file-00000000f41871fdb744b8a6b7b612fa.png" alt="BUNNY MD" width="100">
  
  *Made with ❤️ by Lupin Starnley*
  
  _Powered by Bunny Tech_
</div>
