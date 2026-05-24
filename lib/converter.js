// lib/converter.js
import sharp from 'sharp'

export async function webp2png(buffer) {
  try {
    return await sharp(buffer)
      .png()
      .toBuffer()
  } catch (err) {
    throw new Error('Failed to convert webp to png')
  }
}