// commands/anime/aniwords.js
import axios from 'axios'

export const name = 'aniwords'
export const alias = ['aq', 'animeq', 'wisdom']
export const category = 'Anime'
export const desc = 'Get random anime quotes with character thumbnail'

const TIMEOUT = 8000 // 8s per API

// 15+ ANIME QUOTE APIs
const QUOTE_APIS = [
  // 1. AnimeChan
  async () => {
    const res = await axios.get('https://animechan.xyz/api/random', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 2. Katanime
  async () => {
    const res = await axios.get('https://katanime.vercel.app/api/getrandom', { timeout: TIMEOUT })
    const data = res.data?.result
    return {
      quote: data?.english,
      character: data?.character,
      anime: data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data?.character)}&background=random&size=512`
    }
  },

  // 3. Waifu.it Quotes
  async () => {
    const res = await axios.get('https://waifu.it/api/v4/quote', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.author,
      anime: res.data?.anime,
      image: res.data?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.author)}&background=random&size=512`
    }
  },

  // 4. Kyoko
  async () => {
    const res = await axios.get('https://kyoko.rei.my.id/api/quotes/anime', { timeout: TIMEOUT })
    const data = res.data?.result
    return {
      quote: data?.english,
      character: data?.character,
      anime: data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data?.character)}&background=random&size=512`
    }
  },

  // 5. ZenQuotes
  async () => {
    const res = await axios.get('https://zenquotes.io/api/random', { timeout: TIMEOUT })
    const data = res.data?.[0]
    return {
      quote: data?.q,
      character: data?.a,
      anime: 'Wisdom',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data?.a)}&background=random&size=512`
    }
  },

  // 6. AnimeQuote API
  async () => {
    const res = await axios.get('https://anime-quote-api.herokuapp.com/api/quotes/random', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 7. AnimeChan V2
  async () => {
    const res = await axios.get('https://animechan.vercel.app/api/random', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 8. Shiro.gg
  async () => {
    const res = await axios.get('https://shiro.gg/api/quotes', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: res.data?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 9. PurrBot
  async () => {
    const res = await axios.get('https://purrbot.site/api/quote', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: res.data?.icon || `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 10. Nekos.best
  async () => {
    const res = await axios.get('https://nekos.best/api/v2/quote', { timeout: TIMEOUT })
    const data = res.data?.results?.[0]
    return {
      quote: data?.quote,
      character: data?.anime_name,
      anime: data?.anime_name,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data?.anime_name)}&background=random&size=512`
    }
  },

  // 11. Local Anime DB
  async () => {
    const quotes = [
      { q: "A lesson without pain is meaningless.", c: "Edward Elric", a: "Fullmetal Alchemist" },
      { q: "If you don't take risks, you can't create a future.", c: "Monkey D. Luffy", a: "One Piece" },
      { q: "Power comes in response to a need, not a desire.", c: "Goku", a: "Dragon Ball Z" },
      { q: "Fear is not evil. It tells you what weakness is.", c: "Gildarts", a: "Fairy Tail" },
      { q: "The world isn't perfect. But it's there for us.", c: "Roy Mustang", a: "Fullmetal Alchemist" },
      { q: "To know sorrow is not terrifying. What is terrifying is to know you can't go back.", c: "Matsumoto Rangiku", a: "Bleach" },
      { q: "Hard work betrays none, but dreams betray many.", c: "Hachiman Hikigaya", a: "Oregairu" },
      { q: "It's not the face that makes someone a monster, it's the choices they make.", c: "Naruto Uzumaki", a: "Naruto" }
    ]
    const data = quotes[Math.floor(Math.random() * quotes.length)]
    return {
      quote: data.q,
      character: data.c,
      anime: data.a,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.c)}&background=random&size=512`
    }
  },

  // 12. Quotable
  async () => {
    const res = await axios.get('https://api.quotable.io/random?tags=anime', { timeout: TIMEOUT })
    return {
      quote: res.data?.content,
      character: res.data?.author,
      anime: 'Anime',
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.author)}&background=random&size=512`
    }
  },

  // 13. Anime Facts
  async () => {
    const res = await axios.get('https://anime-facts-rest-api.herokuapp.com/api/v1', { timeout: TIMEOUT })
    return {
      quote: res.data?.data?.fact,
      character: 'Anime Fact',
      anime: res.data?.data?.anime_name,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.data?.anime_name)}&background=random&size=512`
    }
  },

  // 14. Backup AnimeChan
  async () => {
    const res = await axios.get('https://animechan.xyz/api/random', { timeout: TIMEOUT })
    return {
      quote: res.data?.quote,
      character: res.data?.character,
      anime: res.data?.anime,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(res.data?.character)}&background=random&size=512`
    }
  },

  // 15. Extra Local
  async () => {
    const quotes = [
      { q: "People die if they are killed.", c: "Shirou Emiya", a: "Fate/stay night" },
      { q: "I'll take a potato chip... AND EAT IT!", c: "Light Yagami", a: "Death Note" },
      { q: "Believe it!", c: "Naruto Uzumaki", a: "Naruto" }
    ]
    const data = quotes[Math.floor(Math.random() * quotes.length)]
    return {
      quote: data.q,
      character: data.c,
      anime: data.a,
      image: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.c)}&background=random&size=512`
    }
  }
]

export default async function aniwords(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: { text: '💭', key: msg.key }
    })

    let quoteData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < QUOTE_APIS.length; i++) {
      try {
        quoteData = await QUOTE_APIS[i]()
        if (quoteData && quoteData.quote) break
      } catch (e) {
        continue
      }
    }

    if (!quoteData ||!quoteData.quote) {
      throw new Error('No quote found')
    }

    // CLEAN MESSAGE - NO API/SOURCE MENTIONED
    const caption = `╭─⌈ 💭 *ANIME WISDOM* ⌋
│
│ "${quoteData.quote}"
│
│ — *${quoteData.character}*
│ ${quoteData.anime}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      image: { url: quoteData.image },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '✨', key: msg.key } })

  } catch (error) {
    console.error('[ANIWORDS ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: '> Failed to get quote. Try again' 
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}