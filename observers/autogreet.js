// observers/autogreet.js
import { supabase } from '../lib/supabase.js'
import cron from 'node-cron'

const GREET_MESSAGES = {
  morning: [
    "Good morning {group_name}! Rise and shine 🌅",
    "Habari za asubuhi {group_name}! Mungu awabariki siku yenu ☀️",
    "Morning {group_name} fam! Coffee ready? ☕",
    "Wake up {group_name}! New blessings await ✨",
    "Asubuhi njema {group_name} ❤️ Kazi ianze!",
    "Top of the morning to {group_name}! Let's win today 🏆",
    "Rise {group_name}! The world needs your energy ⚡",
    "Habari za asubuhi {group_name}! Leo ni siku ya ushindi 🎯",
    "Morning vibes {group_name} 🌤️ Smile, it's free",
    "Good morning {group_name}! Be the reason someone smiles today 😊",
    "Asubuhi {group_name}! Mungu ametupa siku nyingine 🙏",
    "Wake and grind {group_name} 💪 No excuses",
    "Morning {group_name}! Your dreams are calling 📞",
    "Habari za asubuhi {group_name}! Fanya kitu kikubwa leo 🚀",
    "Sun's up {group_name}! Time to chase goals 🏃",
    "Good morning {group_name}! Stay positive, work hard ☀️",
    "Asubuhi njema {group_name}! Blessings overflowing 🙌",
    "Morning {group_name}! Today is your day 🌟",
    "Habari {group_name}! Asante Mungu kwa uhai 💚",
    "Rise up {group_name}! Champions don't sleep in 👑",
    "Good morning {group_name}! Let's make it count 📊",
    "Asubuhi {group_name}! Keep pushing, keep praying 🕌",
    "Morning light {group_name} ✨ New mercy, new grace",
    "Habari za asubuhi {group_name}! Success starts now ⏰",
    "Wake up {group_name}! Your future is bright 🔮",
    "Morning {group_name}! Spread love, not hate 💜",
    "Asubuhi njema {group_name}! God is with you 👆",
    "Good morning {group_name}! Hustle in silence 🤫",
    "Morning {group_name}! Be kind, be bold, be you 🦁",
    "Habari za asubuhi {group_name}! Miracles happen daily 🌈",
    "Rise {group_name}! Your story isn't over yet 📖",
    "Morning {group_name}! Eat, pray, slay 🍳",
    "Asubuhi {group_name}! Focus on progress, not perfection 🎨",
    "Good morning {group_name}! Let your light shine 💡",
    "Morning vibes {group_name}! Gratitude is the attitude 🙏",
    "Habari za asubuhi {group_name}! Kila la heri leo 🍀",
    "Wake up {group_name}! The grind includes Sunday too 😂",
    "Morning {group_name}! Your vibe attracts your tribe 🔥",
    "Asubuhi njema {group_name}! Baraka tele 💰",
    "Good morning {group_name}! Make today legendary ⚔️",
    "Morning {group_name}! Discipline > Motivation 📏",
    "Habari za asubuhi {group_name}! Usiache ndoto zako 💭",
    "Rise {group_name}! Heaven is watching you 👀",
    "Morning {group_name}! One day or day one? You decide 🗓️",
    "Asubuhi {group_name}! Shukrani kwa kila kitu 🥰",
    "Good morning {group_name}! Attack the day 🥊",
    "Morning {group_name}! Your energy introduces you ⚡",
    "Habari za asubuhi {group_name}! Tenda mema, nenda zako 🕊️",
    "Wake up {group_name}! Kings and queens don't snooze 👑",
    "Morning {group_name}! Today's mantra: I can, I will 💪",
    "Asubuhi njema {group_name}! Mungu akiongoza 🙏",
    "Good morning {group_name}! Be a voice, not an echo 📢"
  ],
  afternoon: [
    "Good afternoon {group_name}! How's the grind? 💼",
    "Habari za mchana {group_name}! Tumekula? 🍛",
    "Afternoon {group_name}! Stay hydrated 💧",
    "Mchana mwema {group_name} ☀️ Break time?",
    "Afternoon vibes {group_name}! Keep pushing 🏃",
    "Good afternoon {group_name}! Half day done, half to go ⏳",
    "Habari za mchana {group_name}! Don't quit now 🎯",
    "Afternoon {group_name}! Your break is deserved 😌",
    "Mchana {group_name}! Lunch was fire? 🔥",
    "Good afternoon {group_name}! Stay focused, finish strong 💪",
    "Habari za mchana {group_name}! Umechoka? Pumzika kidogo 😴",
    "Afternoon {group_name}! Energy check? ⚡",
    "Mchana mwema {group_name}! Keep that same energy 🌪️",
    "Good afternoon {group_name}! Productivity mode ON 📈",
    "Habari za mchana {group_name}! Boss moves only 👔",
    "Afternoon {group_name}! Siesta or no siesta? 😂",
    "Mchana {group_name}! The bag won't chase itself 💰",
    "Good afternoon {group_name}! Consistency is key 🔑",
    "Habari za mchana {group_name}! Umepiga hatua gani? 📊",
    "Afternoon {group_name}! Water > Excuses 🚰",
    "Mchana mwema {group_name}! Keep building 🏗️",
    "Good afternoon {group_name}! Your future self is watching 👀",
    "Habari za mchana {group_name}! No pressure, no diamonds 💎",
    "Afternoon {group_name}! Stretch, breathe, continue 🧘",
    "Mchana {group_name}! Make the afternoon count ⏰",
    "Good afternoon {group_name}! Momentum is everything 🚂",
    "Habari za mchana {group_name}! Kazi ni kazi 💼",
    "Afternoon {group_name}! Small steps, big results 👣",
    "Mchana mwema {group_name}! Stay in your lane 🛣️",
    "Good afternoon {group_name}! Refuel and reload 🔋",
    "Habari za mchana {group_name}! Winners work at noon too 🏆",
    "Afternoon {group_name}! Don't watch the clock, do it ⏱️",
    "Mchana {group_name}! Your hustle is valid 💯",
    "Good afternoon {group_name}! Eat good, feel good 🥗",
    "Habari za mchana {group_name}! Pressure creates greatness 💪",
    "Afternoon {group_name}! Keep the faith, keep working 🙏",
    "Mchana mwema {group_name}! Afternoon slump? Fight it! 🥊",
    "Good afternoon {group_name}! You're halfway there 🏁",
    "Habari za mchana {group_name}! Jasho lina baraka 💦",
    "Afternoon {group_name}! Mindset is everything 🧠",
    "Mchana {group_name}! No lunch for slackers 😤",
    "Good afternoon {group_name}! Make moves, not excuses 🚶",
    "Habari za mchana {group_name}! Umeinama kazi? 💻",
    "Afternoon {group_name}! Success is rented daily 💳",
    "Mchana mwema {group_name}! Keep your eyes on the prize 👀",
    "Good afternoon {group_name}! Break rules, not promises 📝",
    "Habari za mchana {group_name}! Joto ama baridi, kazi iendelee 🌡️",
    "Afternoon {group_name}! Your time is now ⏰",
    "Mchana {group_name}! Grind in silence, let success talk 🤫",
    "Good afternoon {group_name}! Afternoon warrior mode ⚔️",
    "Habari za mchana {group_name}! Pambana na hali yako 💪",
    "Afternoon {group_name}! The comeback is stronger 🔄"
  ],
  night: [
    "Good evening {group_name}! How was your day? 🌙",
    "Habari za jioni {group_name}! Tumeshukuru 🙏",
    "Evening {group_name}! Time to unwind 😌",
    "Jioni njema {group_name} ✨ Rest well",
    "Good night {group_name}! Sweet dreams 💤",
    "Habari za usiku {group_name}! Mungu awalinde 🌃",
    "Evening vibes {group_name}! You did great today 👏",
    "Usiku mwema {group_name}! Tomorrow is another chance 🌅",
    "Good evening {group_name}! Family time? 👨‍👩‍👧‍👦",
    "Habari za jioni {group_name}! Pumzika mwili na akili 🧘",
    "Night {group_name}! Charge your soul, not just your phone 🔋",
    "Jioni {group_name}! Gratitude for today 💚",
    "Good evening {group_name}! Reflect, rest, reset 🔄",
    "Habari za usiku {group_name}! Kesho ni siku nyingine 📅",
    "Evening {group_name}! Peace be with you 🕊️",
    "Usiku mwema {group_name}! Sleep like a baby 👶",
    "Good night {group_name}! Angels on duty 👼",
    "Habari za jioni {group_name}! Kazi imeisha, amani ianze ☮️",
    "Night {group_name}! Dream big, sleep tight 🛌",
    "Jioni njema {group_name}! Tomorrow we go again 🔁",
    "Good evening {group_name}! Self-care time 🛁",
    "Habari za usiku {group_name}! Mola awajalie usingizi 💫",
    "Evening {group_name}! You survived today 🏅",
    "Usiku mwema {group_name}! Let go of today 🌬️",
    "Good night {group_name}! Stars can't shine without darkness ⭐",
    "Habari za jioni {group_name}! Asante kwa mchango wako 🤝",
    "Night {group_name}! Bed is calling 📞",
    "Jioni {group_name}! Unplug to recharge 🔌",
    "Good evening {group_name}! Kindness costs nothing 💝",
    "Habari za usiku {group_name}! Ndoto njema 😴",
    "Evening {group_name}! Today was a lesson, not a loss 📚",
    "Usiku mwema {group_name}! Sleep is the best meditation 🧘",
    "Good night {group_name}! Tomorrow's power hour starts now ⏰",
    "Habari za jioni {group_name}! Pumzika mfalme/malkia 👑",
    "Night {group_name}! The moon is watching 🌕",
    "Jioni njema {group_name}! Close your eyes, open your dreams ✨",
    "Good evening {group_name}! Finished or not, rest now 🛑",
    "Habari za usiku {group_name}! Usingizi wa amani 🕊️",
    "Evening {group_name}! You matter, you did enough 💜",
    "Usiku mwema {group_name}! See you in dreamland 🎭",
    "Good night {group_name}! Recharge for greatness ⚡",
    "Habari za jioni {group_name}! Mungu yupo kazini hata usiku 🌃",
    "Night {group_name}! No more scrolling, time for healing 📵",
    "Jioni {group_name}! Thank yourself for today 🙌",
    "Good evening {group_name}! Soft life activated 😌",
    "Habari za usiku {group_name}! Lala salama salimini 🛡️",
    "Evening {group_name}! The day is done, you won 🏁",
    "Usiku mwema {group_name}! Blanket season activated 🛌",
    "Good night {group_name}! Sleep is a superpower 🦸",
    "Habari za jioni {group_name}! Tulia, pumzika 🌊",
    "Night {group_name}! Tomorrow we eat again 🍽️",
    "Jioni njema {group_name}! Peace, love, sleep ☮️💚😴"
  ]
}

let isRunning = false

async function sendGreet(sock, greetType) {
  if (isRunning) return
  isRunning = true

  try {
    // 1. GET ALL CODES WITH AUTOGREET ON
    const { data: activeCodes } = await supabase
   .from('feature_flags')
   .select(`
        code,
        autogreet,
        autogreet_msg_asubuhi,
        autogreet_msg_mchana,
        autogreet_msg_usiku,
        autogreet_timezone,
        autogreet_weekends,
        group_codes!inner(group_jid, group_name)
      `)
   .eq('autogreet', true)

    if (!activeCodes || activeCodes.length === 0) return

    for (const flag of activeCodes) {
      try {
        const code = flag.code
        const groupJid = flag.group_codes.group_jid
        const groupName = flag.group_codes.group_name

        // 2. CHECK WEEKENDS
        const now = new Date()
        const day = now.getDay() // 0 = Sunday, 6 = Saturday
        if (!flag.autogreet_weekends && (day === 0 || day === 6)) continue

        // 3. CHECK IF ALREADY SENT TODAY - PREVENT DUPLICATES
        const today = now.toISOString().split('T')[0]
        const { data: existingLog } = await supabase
       .from('autogreet_logs')
       .select('id')
       .eq('code', code)
       .eq('greet_type', greetType)
       .gte('sent_at', `${today}T00:00:00Z`)
       .lte('sent_at', `${today}T23:59:59Z`)
       .maybeSingle()

        if (existingLog) continue

        // 4. GET CUSTOM MESSAGE OR USE RANDOM
        let message = ''
        const customKey = `autogreet_msg_${greetType}`
        if (flag[customKey] && flag[customKey].trim()!== '') {
          message = flag[customKey]
        } else {
          const msgPool = GREET_MESSAGES[greetType]
          message = msgPool[Math.floor(Math.random() * msgPool.length)]
        }

        // 5. REPLACE PLACEHOLDERS
        message = message.replace(/{group_name}/g, groupName)
        message = message.replace(/{code}/g, code)

        // 6. RANDOM MENTION LOGIC - 30% CHANCE
        let mentions = []
        if (Math.random() < 0.3) {
          try {
            const groupMeta = await sock.groupMetadata(groupJid)
            const participants = groupMeta.participants
            .filter(p =>!p.admin) // Don't mention admins too much
            .map(p => p.id)

            // Pick 1-3 random online-ish members
            const mentionCount = Math.floor(Math.random() * 3) + 1
            const shuffled = participants.sort(() => 0.5 - Math.random())
            mentions = shuffled.slice(0, Math.min(mentionCount, participants.length))

            if (mentions.length > 0) {
              const mentionTexts = mentions.map(jid => `@${jid.split('@')[0]}`).join(' ')
              message += `\n\n${mentionTexts}`
            }
          } catch {}
        }

        // 7. SEND MESSAGE
        await sock.sendMessage(groupJid, {
          text: message,
          mentions: mentions.length > 0? mentions : undefined
        })

        // 8. LOG TO SUPABASE
        await supabase.from('autogreet_logs').insert({
          code: code,
          group_jid: groupJid,
          greet_type: greetType,
          message_sent: message
        })

        // 9. RANDOM DELAY BETWEEN GROUPS - LOOK HUMAN
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

      } catch (groupErr) {
        console.log(`[AUTOGREET ERROR] ${flag.code}:`, groupErr.message)
      }
    }

    // 10. CLEAN OLD LOGS
    await supabase.rpc('delete_old_feature_logs')

  } catch (err) {
    console.log('[AUTOGREET CRON ERROR]', err.message)
  } finally {
    isRunning = false
  }
}

export default function autogreet(sock) {
  // Morning 6:00 AM
  cron.schedule('0 6 * * *', () => sendGreet(sock, 'morning'), {
    timezone: "Africa/Dar_es_Salaam"
  })

  // Afternoon 1:00 PM
  cron.schedule('0 13 * * *', () => sendGreet(sock, 'afternoon'), {
    timezone: "Africa/Dar_es_Salaam"
  })

  // Night 8:00 PM
  cron.schedule('0 20 * * *', () => sendGreet(sock, 'night'), {
    timezone: "Africa/Dar_es_Salaam"
  })

  console.log('[AUTOGREET] Cron jobs initialized - 6AM, 1PM, 8PM EAT')
}