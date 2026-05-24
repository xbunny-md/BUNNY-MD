// commands/anime/animejoke.js
import axios from 'axios'

export const name = 'animejoke'
export const alias = ['aj', 'alaugh', 'afunny']
export const category = 'Anime'
export const desc = 'Get random anime jokes with 15 API fallbacks'

const TIMEOUT = 8000 // 8s per API

// 15 REAL ANIME JOKE APIs - NO LOCAL
const JOKE_APIS = [
  // 1. JokeAPI Anime
  async () => {
    const res = await axios.get('https://v2.jokeapi.dev/joke/Programming?contains=anime', { timeout: TIMEOUT })
    const joke = res.data?.type === 'single'? res.data?.joke : `${res.data?.setup}\n\n${res.data?.delivery}`
    return {
      joke: joke,
      image: `https://ui-avatars.com/api/?name=Anime+Laugh&background=ff6b6b&color=fff&size=512`
    }
  },

  // 2. Humor API
  async () => {
    const res = await axios.get('https://api.humorapi.com/jokes/random', {
      params: { keywords: 'anime,otaku,waifu' },
      timeout: TIMEOUT
    })
    return {
      joke: res.data?.joke,
      image: `https://ui-avatars.com/api/?name=Humor&background=4ecdc4&color=fff&size=512`
    }
  },

  // 3. Jokes One API
  async () => {
    const res = await axios.get('https://api.jokes.one/joke/anime', { timeout: TIMEOUT })
    const joke = res.data?.contents?.jokes?.[0]?.joke
    return {
      joke: joke?.text || joke?.clean,
      image: `https://ui-avatars.com/api/?name=Laugh&background=45b7d1&color=fff&size=512`
    }
  },

  // 4. Dad Jokes Anime
  async () => {
    const res = await axios.get('https://icanhazdadjoke.com/search', {
      params: { term: 'anime', limit: 1 },
      headers: { 'Accept': 'application/json' },
      timeout: TIMEOUT
    })
    return {
      joke: res.data?.results?.[0]?.joke,
      image: `https://ui-avatars.com/api/?name=Dad+Laugh&background=f9ca24&color=fff&size=512`
    }
  },

  // 5. Chuck Norris Anime
  async () => {
    const res = await axios.get('https://api.chucknorris.io/jokes/search', {
      params: { query: 'anime' },
      timeout: TIMEOUT
    })
    const jokes = res.data?.result
    const joke = jokes?.[Math.floor(Math.random() * jokes.length)]
    return {
      joke: joke?.value,
      image: `https://ui-avatars.com/api/?name=Chuck&background=6c5ce7&color=fff&size=512`
    }
  },

  // 6. Official Joke API
  async () => {
    const res = await axios.get('https://official-joke-api.appspot.com/jokes/programming/random', { timeout: TIMEOUT })
    const joke = res.data?.[0]
    return {
      joke: `${joke?.setup}\n\n${joke?.punchline}\n\nOtaku edition`,
      image: `https://ui-avatars.com/api/?name=Dev+Laugh&background=a29bfe&color=fff&size=512`
    }
  },

  // 7. Yo Momma Anime
  async () => {
    const res = await axios.get('https://api.yomomma.info/', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke?.replace(/momma/g, 'your waifu'),
      image: `https://ui-avatars.com/api/?name=Yo+Waifu&background=fd79a8&color=fff&size=512`
    }
  },

  // 8. Geek Jokes
  async () => {
    const res = await axios.get('https://geek-jokes.sameerkumar.website/api?format=json', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke + ' - Weeb style',
      image: `https://ui-avatars.com/api/?name=Geek&background=00b894&color=fff&size=512`
    }
  },

  // 9. Joke Generator
  async () => {
    const res = await axios.get('https://backend-omega-seven.vercel.app/api/getjoke', { timeout: TIMEOUT })
    const joke = res.data?.[0]
    return {
      joke: `${joke?.question}\n\n${joke?.punchline}`,
      image: `https://ui-avatars.com/api/?name=Generator&background=e17055&color=fff&size=512`
    }
  },

  // 10. Sv443 Jokes
  async () => {
    const res = await axios.get('https://sv443.net/jokeapi/v2/joke/Programming,Misc', { timeout: TIMEOUT })
    const joke = res.data?.type === 'single'? res.data?.joke : `${res.data?.setup}\n\n${res.data?.delivery}`
    return {
      joke: joke,
      image: `https://ui-avatars.com/api/?name=Sv443&background=0984e3&color=fff&size=512`
    }
  },

  // 11. Random Joke API
  async () => {
    const res = await axios.get('https://random-joke-api.vercel.app/api/jokes', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke,
      image: `https://ui-avatars.com/api/?name=Random&background=00cec9&color=fff&size=512`
    }
  },

  // 12. Joke API Vercel
  async () => {
    const res = await axios.get('https://joke-generator.vercel.app/api/random', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke,
      image: `https://ui-avatars.com/api/?name=Generator&background=6c5ce7&color=fff&size=512`
    }
  },

  // 13. Jokes API
  async () => {
    const res = await axios.get('https://jokes-api.vercel.app/api/jokes', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke,
      image: `https://ui-avatars.com/api/?name=API+Laugh&background=fdcb6e&color=fff&size=512`
    }
  },

  // 14. Funny Jokes API
  async () => {
    const res = await axios.get('https://funny-jokes.vercel.app/api/jokes', { timeout: TIMEOUT })
    return {
      joke: res.data?.joke,
      image: `https://ui-avatars.com/api/?name=Funny&background=e84393&color=fff&size=512`
    }
  },

  // 15. Pun API
  async () => {
    const res = await axios.get('https://punapi.rest/api/pun', { timeout: TIMEOUT })
    return {
      joke: res.data?.pun + '\n\nAnime pun!',
      image: `https://ui-avatars.com/api/?name=Pun&background=00b894&color=fff&size=512`
    }
  }
]

export default async function animejoke(sock, { msg, from }, botSettings) {
  try {
    await sock.sendMessage(from, {
      react: { text: '😂', key: msg.key }
    })

    let jokeData = null

    // TRY ALL 15 APIS SILENTLY
    for (let i = 0; i < JOKE_APIS.length; i++) {
      try {
        jokeData = await JOKE_APIS[i]()
        if (jokeData && jokeData.joke && jokeData.joke.length > 10) break
      } catch (e) {
        continue
      }
    }

    if (!jokeData ||!jokeData.joke) {
      throw new Error('No joke found')
    }

    // CLEAN MESSAGE - NO API/SOURCE
    const caption = `╭─⌈ 😂 *ANIME LAUGH* ⌋
│
│ ${jokeData.joke}
│
╰⊷ *Powered By Bunny Tech*`

    await sock.sendMessage(from, {
      image: { url: jokeData.image },
      caption: caption
    }, { quoted: msg })

    await sock.sendMessage(from, { react: { text: '🤣', key: msg.key } })

  } catch (error) {
    console.error('[ANIMEJOKE ERROR]', error.message)
    await sock.sendMessage(from, { 
      text: '> Failed to get laugh. Try again' 
    }, { quoted: msg })
    await sock.sendMessage(from, { react: { text: '❌', key: msg.key } })
  }
}