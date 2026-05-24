// lib/converter.js
import sharp from 'sharp'
import { writeFile, readFile, unlink } from 'fs/promises'
import { spawn } from 'child_process'
import { join } from 'path'
import { tmpdir } from 'os'

/**
 * Convert WebP to PNG
 * @param {Buffer} buffer - WebP buffer
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function webp2png(buffer) {
  try {
    return await sharp(buffer)
      .png()
      .toBuffer()
  } catch (err) {
    throw new Error('Failed to convert webp to png')
  }
}

/**
 * Convert WebP to JPG
 * @param {Buffer} buffer - WebP buffer
 * @returns {Promise<Buffer>} JPG buffer
 */
export async function webp2jpg(buffer) {
  try {
    return await sharp(buffer)
      .jpeg({ quality: 90 })
      .toBuffer()
  } catch (err) {
    throw new Error('Failed to convert webp to jpg')
  }
}

/**
 * Convert Animated WebP to MP4
 * @param {Buffer} buffer - WebP buffer
 * @returns {Promise<Buffer>} MP4 buffer
 */
export async function webp2mp4(buffer) {
  const input = join(tmpdir(), `input_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`)
  const output = join(tmpdir(), `output_${Date.now()}_${Math.random().toString(36).slice(2)}.mp4`)
  
  try {
    await writeFile(input, buffer)
    
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', input,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000,setsar=1',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', 'faststart',
        '-pix_fmt', 'yuv420p',
        '-an',
        '-y',
        output
      ], { stdio: 'ignore' })
      
      ffmpeg.on('error', reject)
      ffmpeg.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}`))
      })
    })
    
    const result = await readFile(output)
    
    // Cleanup
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
    
    return result
  } catch (err) {
    // Cleanup on error
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
    throw new Error('Failed to convert webp to mp4: ' + err.message)
  }
}

/**
 * Convert Animated WebP to GIF
 * @param {Buffer} buffer - WebP buffer
 * @returns {Promise<Buffer>} GIF buffer
 */
export async function webp2gif(buffer) {
  const input = join(tmpdir(), `input_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`)
  const output = join(tmpdir(), `output_${Date.now()}_${Math.random().toString(36).slice(2)}.gif`)
  
  try {
    await writeFile(input, buffer)
    
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', input,
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
        '-gifflags', '+transdiff',
        '-y',
        output
      ], { stdio: 'ignore' })
      
      ffmpeg.on('error', reject)
      ffmpeg.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(`ffmpeg exited with code ${code}`))
      })
    })
    
    const result = await readFile(output)
    
    // Cleanup
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
    
    return result
  } catch (err) {
    // Cleanup on error
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
    throw new Error('Failed to convert webp to gif: ' + err.message)
  }
}