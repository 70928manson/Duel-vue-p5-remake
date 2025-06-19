<template>
  <div class="duel-game">
    <div ref="gameContainer" class="game-container"></div>
    <div v-if="showInstructions" class="instructions-overlay" @click="showInstructions = false">
      <div class="instructions-box">
        <div class="instruction-line">
          <span class="key">Z key:</span>
          <span class="description">Weak shot<br>(auto aiming)</span>
        </div>
        <div class="instruction-line">
          <span class="key">X key:</span>
          <span class="description">Lethal shot<br>(manual aiming,<br>requires charge)</span>
        </div>
        <div class="instruction-line">
          <span class="key">Arrow key:</span>
          <span class="description">Move<br>(or aim lethal shot)</span>
        </div>
        <div class="start-text">- Press SPACE to start -</div>
        <div class="hide-text">(Click to hide this window)</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import p5 from 'p5'
import { GameSystem } from '@/game/GameSystem'
import { KeyInput } from '@/game/KeyInput'

const gameContainer = ref<HTMLDivElement>()
const showInstructions = ref(true)

let p5Instance: p5 | null = null
let gameSystem: GameSystem | null = null
let keyInput: KeyInput | null = null

const IDEAL_FRAME_RATE = 60
const CANVAS_SIZE = 640

onMounted(() => {
  if (gameContainer.value) {
    const sketch = (p: p5) => {
      let scaleFactor = 1

      p.setup = () => {
        // 使用較大的畫布尺寸，並支援響應式
        const containerRect = gameContainer.value!.getBoundingClientRect()
        const availableSize = Math.min(containerRect.width, containerRect.height, window.innerWidth, window.innerHeight)
        const canvasSize = Math.max(CANVAS_SIZE, availableSize * 0.9) // 至少640px，或90%的可用空間
        scaleFactor = canvasSize / CANVAS_SIZE
        
        p.createCanvas(canvasSize, canvasSize)
        p.frameRate(IDEAL_FRAME_RATE)
        p.rectMode(p.CENTER)
        p.ellipseMode(p.CENTER)
        p.textAlign(p.CENTER, p.CENTER)
        
        // Initialize game components
        keyInput = new KeyInput()
        gameSystem = new GameSystem(p, true, true) // demo mode with instructions
        
        console.log('Game initialized - Canvas size:', canvasSize, 'Scale factor:', scaleFactor)
      }

      p.draw = () => {
        if (!gameSystem || !keyInput) return
        
        p.background(255)
        p.push()
        p.scale(scaleFactor)
        
        // Update key input - 確保每幀都更新
        keyInput.update()
        
        // Run game system
        gameSystem.run(keyInput)
        
        p.pop()
      }

      p.keyPressed = () => {
        if (!keyInput) return
        
        console.log('Key pressed:', p.key, p.keyCode)
        keyInput.keyPressed(p.key, p.keyCode)
        
        // Check for game start - 改為空白鍵開始遊戲
        if (p.key === ' ' && gameSystem?.isDemoMode) {
          console.log('Starting new game from demo mode!')
          gameSystem = new GameSystem(p, false, false) // start actual game
          showInstructions.value = false
        }
        
        // 防止默認行為，避免頁面滾動等
        return false
      }

      p.keyReleased = () => {
        if (!keyInput) return
        console.log('Key released:', p.key, p.keyCode)
        keyInput.keyReleased(p.key, p.keyCode)
        
        // 防止默認行為
        return false
      }

      p.mousePressed = () => {
        if (gameSystem) {
          // 點擊切換說明視窗顯示狀態
          gameSystem.toggleInstructions()
          showInstructions.value = gameSystem.showsInstructionWindow
          console.log('Instructions toggled:', gameSystem.showsInstructionWindow)
        }
      }

      // 添加window事件監聽來確保鍵盤輸入
      p.windowResized = () => {
        const containerRect = gameContainer.value!.getBoundingClientRect()
        const availableSize = Math.min(containerRect.width, containerRect.height, window.innerWidth, window.innerHeight)
        const canvasSize = Math.max(CANVAS_SIZE, availableSize * 0.9)
        scaleFactor = canvasSize / CANVAS_SIZE
        p.resizeCanvas(canvasSize, canvasSize)
      }
    }

    p5Instance = new p5(sketch, gameContainer.value)
    
    // 確保canvas可以接收鍵盤事件
    setTimeout(() => {
      const canvas = gameContainer.value?.querySelector('canvas')
      if (canvas) {
        canvas.tabIndex = 0
        canvas.focus()
        console.log('Canvas focused for keyboard input')
      }
    }, 100)
  }
})

onUnmounted(() => {
  if (p5Instance) {
    p5Instance.remove()
  }
})

// 添加全局鍵盤事件監聽作為備用
const handleKeyDown = (event: KeyboardEvent) => {
  if (keyInput && gameSystem) {
    // 立即處理輸入，不等待任何延遲
    keyInput.keyPressed(event.key, event.keyCode)
    
    // 檢查遊戲開始 - 改為空白鍵
    if (event.key === ' ' && gameSystem.isDemoMode) {
      console.log('Starting new game from global event!')
      gameSystem = new GameSystem(p5Instance as any, false, false)
      showInstructions.value = false
    }
    
    // 積極防止所有可能導致延遲的默認行為
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'z', 'x', 'Z', 'X'].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
    
    console.log('Global key down:', event.key, event.keyCode)
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  if (keyInput) {
    // 立即處理按鍵釋放
    keyInput.keyReleased(event.key, event.keyCode)
    
    // 積極防止默認行為
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'z', 'x', 'Z', 'X'].includes(event.key)) {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
    }
    
    console.log('Global key up:', event.key, event.keyCode)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<style scoped>
.duel-game {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f0f0f0;
  overflow: hidden;
}

.game-container {
  position: relative;
  border: 2px solid #333;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.game-container canvas {
  display: block;
  border-radius: 6px;
  outline: none;
}

.instructions-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 10;
}

.instructions-box {
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #333;
  border-radius: 8px;
  padding: 30px;
  text-align: center;
  max-width: 400px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.instruction-line {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  text-align: left;
}

.key {
  font-weight: bold;
  min-width: 100px;
  color: #333;
}

.description {
  flex: 1;
  margin-left: 20px;
  line-height: 1.4;
  color: #666;
}

.start-text {
  margin-top: 30px;
  font-weight: bold;
  font-size: 18px;
  color: #007acc;
}

.hide-text {
  margin-top: 10px;
  font-size: 14px;
  color: #666;
}
</style> 