import { createCanvas } from 'canvas'

export default async function handler(req, res) {
  const { question, options } = req.query
  
  // Set the canvas size - standard OG image dimensions
  const width = 1200
  const height = 630
  
  // Create canvas
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  
  // Theme colors - couple/relationship themed (warm pink/red tones)
  const backgroundColor = '#ffd1e7' // Light pink background
  const primaryColor = '#e84393'   // Pink accent
  const textColor = '#333333'       // Dark text
  const optionColor = '#ff6b6b'     // Option background
  
  // Fill background
  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, width, height)
  
  // Draw decorative top section
  ctx.fillStyle = primaryColor
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  ctx.lineTo(width * 0.5, height * 0.4)
  ctx.lineTo(0, height * 0.4)
  ctx.closePath()
  ctx.fill()
  
  // Add title/label
  ctx.fillStyle = '#ff6b6b'
  ctx.font = 'bold 32px "Inter", "Helvetica", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Couple in Bond Poll', width / 2, 60)
  
  // Draw divider line
  ctx.strokeStyle = '#ffd1e7'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(width * 0.1, 80)
  ctx.lineTo(width * 0.9, 80)
  ctx.stroke()
  
  // Draw poll question
  ctx.fillStyle = textColor
  ctx.font = 'bold 24px "Inter", "Helvetica", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillText(question || 'What would you choose?', width * 0.1, 110)
  
  // Draw options
  const optionHeight = 50
  const startY = 160
  const maxOptions = options ? Math.min(options.length, 4) : 2
  
  for (let i = 0; i < maxOptions; i++) {
    const option = options ? options[i] : `Option ${i + 1}`
    
    // Option background box
    ctx.fillStyle = optionColor
    ctx.fillRect(width * 0.1, startY + i * (optionHeight + 20), width * 0.8, optionHeight)
    
    // Option text
    ctx.fillStyle = '#ffffff'
    ctx.font = '20px "Inter", "Helvetica", sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(option, width * 0.15, startY + 30 + i * (optionHeight + 20))
  }
  
  // Add "Vote" call to action at bottom
  ctx.fillStyle = primaryColor
  ctx.font = 'bold 28px "Inter", "Helvetica", sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('Share Your Choice', width / 2, height - 40)
  
  // Add subtle decorative elements
  ctx.fillStyle = 'rgba(255, 107, 147, 0.3)'
  ctx.beginPath()
  ctx.arc(width - 80, 80, 30, 0, Math.PI * 2)
  ctx.fill()
  
  // Return the image as a buffer
  const buffer = canvas.encode('png')
  res.set('Content-Type', 'image/png')
  res.send(buffer)
}